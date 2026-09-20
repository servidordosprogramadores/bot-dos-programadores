const { Events } = require("discord.js");
const { connectDB } = require("../github/model");
const { ActivityModel } = require("./model");
require("dotenv").config();

const GUILD_ID = process.env.GUILD_ID;
const TOP_SIZE = 10;

// Gravar a cada mensagem bateria no banco dezenas de vezes por minuto, então os
// incrementos ficam em memória e vão num bulkWrite periódico.
const FLUSH_INTERVAL_MS = 60 * 1000;

const pendingMessages = new Map();
const pendingVoiceSeconds = new Map();

// discordId -> timestamp de quando entrou na call
const voiceSince = new Map();

function addPending(map, discordId, amount) {
  map.set(discordId, (map.get(discordId) ?? 0) + amount);
}

function closeVoiceSession(discordId) {
  const startedAt = voiceSince.get(discordId);
  if (!startedAt) return;

  voiceSince.delete(discordId);

  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  if (seconds > 0) addPending(pendingVoiceSeconds, discordId, seconds);
}

async function flush() {
  if (!pendingMessages.size && !pendingVoiceSeconds.size) return;

  const messages = new Map(pendingMessages);
  const voice = new Map(pendingVoiceSeconds);
  pendingMessages.clear();
  pendingVoiceSeconds.clear();

  const ids = new Set([...messages.keys(), ...voice.keys()]);

  const operations = [...ids].map((discordId) => ({
    updateOne: {
      filter: { discordId },
      update: {
        $inc: {
          messageCount: messages.get(discordId) ?? 0,
          voiceSeconds: voice.get(discordId) ?? 0,
        },
        $set: { updatedAt: new Date() },
      },
      upsert: true,
    },
  }));

  try {
    await connectDB();
    await ActivityModel.bulkWrite(operations, { ordered: false });
    console.log(`[Activity] ✓ ${operations.length} membro(s) atualizado(s).`);
  } catch (error) {
    // Devolve o que não foi gravado para a próxima rodada, em vez de perder.
    for (const [discordId, count] of messages) addPending(pendingMessages, discordId, count);
    for (const [discordId, seconds] of voice) addPending(pendingVoiceSeconds, discordId, seconds);
    console.error("[Activity] ✗ Falha ao gravar. Os dados voltaram para a fila:", error.message);
  }
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours && minutes) return `${hours}h ${minutes}min`;
  if (hours) return `${hours}h`;
  if (minutes) return `${minutes}min`;
  return `${totalSeconds}s`;
}

function pluralize(count, singular, plural) {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : plural}`;
}

function formatRank(entries, format) {
  if (!entries.length) return "Nenhum dado ainda.";

  return entries
    .map((entry, index) => `- **${index + 1}.** <@${entry.discordId}> — ${format(entry)}`)
    .join("\n");
}

/**
 * O tempo de quem está em call agora ainda não foi gravado, então soma a sessão
 * aberta — senão quem entrou há duas horas apareceria com o total de ontem.
 */
function pendingSecondsFor(discordId) {
  const startedAt = voiceSince.get(discordId);
  const live = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  return (pendingVoiceSeconds.get(discordId) ?? 0) + live;
}

async function getRanks() {
  await connectDB();
  await flush();

  // Quem está em call agora pode nem ter registro no banco ainda, então esses
  // ids entram na conta à parte: sem isso, alguém em call há horas sem nunca ter
  // saído ficaria fora do ranking.
  const liveIds = [...voiceSince.keys()];

  const [byMessages, byVoice, liveEntries] = await Promise.all([
    ActivityModel.find({ messageCount: { $gt: 0 } })
      .sort({ messageCount: -1 })
      .limit(TOP_SIZE)
      .lean(),
    ActivityModel.find({ voiceSeconds: { $gt: 0 } })
      .sort({ voiceSeconds: -1 })
      .limit(TOP_SIZE)
      .lean(),
    liveIds.length
      ? ActivityModel.find({ discordId: { $in: liveIds } }).lean()
      : Promise.resolve([]),
  ]);

  const voiceTotals = new Map();
  for (const entry of [...byVoice, ...liveEntries]) {
    voiceTotals.set(entry.discordId, entry.voiceSeconds ?? 0);
  }
  for (const discordId of liveIds) {
    if (!voiceTotals.has(discordId)) voiceTotals.set(discordId, 0);
  }

  const voiceWithLive = [...voiceTotals]
    .map(([discordId, seconds]) => ({
      discordId,
      voiceSeconds: seconds + pendingSecondsFor(discordId),
    }))
    .filter((entry) => entry.voiceSeconds > 0)
    .sort((a, b) => b.voiceSeconds - a.voiceSeconds)
    .slice(0, TOP_SIZE);

  return {
    textRank: formatRank(byMessages, (entry) =>
      `**${pluralize(entry.messageCount, "mensagem", "mensagens")}**`
    ),
    voiceRank: formatRank(voiceWithLive, (entry) => `**${formatDuration(entry.voiceSeconds)}**`),
  };
}

function trackActivity(client) {
  client.on(Events.MessageCreate, (message) => {
    if (message.author?.bot) return;
    if (message.guild?.id !== GUILD_ID) return;

    addPending(pendingMessages, message.author.id, 1);
  });

  client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    const member = newState.member ?? oldState.member;
    if (!member || member.user.bot) return;
    if ((newState.guild?.id ?? oldState.guild?.id) !== GUILD_ID) return;

    const afkChannelId = newState.guild?.afkChannelId;
    const isCounted = (channelId) => Boolean(channelId) && channelId !== afkChannelId;

    const wasIn = isCounted(oldState.channelId);
    const isIn = isCounted(newState.channelId);

    // Trocar de canal mantém a sessão aberta; mute e deaf não mexem em nada.
    if (!wasIn && isIn) {
      voiceSince.set(member.id, Date.now());
    } else if (wasIn && !isIn) {
      closeVoiceSession(member.id);
    }
  });

  // Quem já estava em call quando o bot subiu começa a contar a partir de agora.
  const guild = client.guilds.cache.get(GUILD_ID);
  if (guild) {
    let resumed = 0;
    for (const [, state] of guild.voiceStates.cache) {
      if (state.channelId && state.channelId !== guild.afkChannelId && !state.member?.user.bot) {
        voiceSince.set(state.id, Date.now());
        resumed++;
      }
    }
    if (resumed) console.log(`[Activity] ${resumed} membro(s) já em call. Contagem iniciada agora.`);
  }

  setInterval(flush, FLUSH_INTERVAL_MS);
  console.log(`[Activity] ✓ Contando mensagens e tempo em call. Gravando a cada ${FLUSH_INTERVAL_MS / 1000}s.`);
}

module.exports = { trackActivity, getRanks, formatDuration };
