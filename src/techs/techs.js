const {
  TextDisplayBuilder,
  MessageFlags,
  ContainerBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  SeparatorSpacingSize,
  SeparatorBuilder,
  MediaGalleryBuilder,
  PermissionFlagsBits,
  Events,
} = require("discord.js");
const { setRole } = require("./setRole");
const { removeRole } = require("./removeRole");
const { getPanelBanner, bannerReference } = require("../utils/panelBanner");
require("dotenv").config();

let channelWebhook = null;
let panelMessageId = null;
let refreshTimer = null;

const BANNER_URL = "https://i.postimg.cc/XJ9cgtR7/PROGRAMADORES5.png";
const BANNER_NAME = "techs-banner.png";

// O Components V2 aceita no máximo 40 componentes por mensagem. O painel gasta 6
// fixos (container, media gallery, 3 blocos de texto e o separador) e cada grupo
// de 5 botões custa 1 action row, então 6 + ceil(n / 5) + n <= 40 dá n = 28.
const MAX_TECHS = 28;
const REFRESH_DEBOUNCE_MS = 5000;

/**
 * Nome de emoji no Discord só aceita [a-z0-9_], então o cargo "C++" nunca casa
 * com o emoji "CPP" de forma literal. Normalizar os dois lados resolve sem
 * precisar de uma tabela de exceções.
 */
function normalizeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/\+/g, "p")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * O ícone do cargo (role.icon) não serve para botão — botão só aceita emoji.
 * Então o ícone vem do emoji customizado cujo nome casa com o cargo, com
 * role.unicodeEmoji como segunda opção.
 *
 * A busca não para no servidor principal: o bot pode usar emoji de qualquer
 * servidor em que esteja, e é comum hospedá-los num servidor só de emojis
 * quando os slots do principal acabam.
 */
function findEmoji(guild, key) {
  const local = guild.emojis.cache.find((item) => normalizeName(item.name) === key);
  if (local) return { emoji: local, source: "este servidor" };

  const external = guild.client.emojis.cache.find((item) => normalizeName(item.name) === key);
  if (external) return { emoji: external, source: `servidor "${external.guild?.name ?? "desconhecido"}"` };

  return null;
}

function resolveEmoji(guild, role) {
  const found = findEmoji(guild, normalizeName(role.name));

  if (found) {
    const { emoji } = found;
    return { id: emoji.id, name: emoji.name, animated: emoji.animated };
  }

  if (role.unicodeEmoji) return role.unicodeEmoji;

  return null;
}

function logRoleReference(guild) {
  const roles = [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .slice(0, 40);

  console.log("[Techs] Cargos do servidor, de cima para baixo, para configurar as variáveis:");
  for (const role of roles) {
    console.log(`[Techs]   position=${String(role.position).padStart(3)} id=${role.id} "${role.name}"`);
  }
}

/**
 * Quando um cargo fica sem emoji, o problema quase sempre é o nome do emoji no
 * servidor ser diferente do nome do cargo. Mostrar os dois lados já normalizados
 * deixa claro o que renomear — e renomear o emoji no Discord resolve sem deploy.
 */
function logEmojiReference(guild, missingRoleNames) {
  console.log("[Techs] Cargos sem emoji, com o nome que o bot procura:");
  for (const roleName of missingRoleNames) {
    console.log(
      `[Techs]   cargo "${roleName}" -> procura um emoji que normalize para "${normalizeName(roleName)}"`
    );
  }

  const visible = [...guild.client.emojis.cache.values()];
  console.log(
    `[Techs] Emojis visíveis ao bot: ${visible.length} (${guild.emojis.cache.size} neste servidor).`
  );

  for (const emoji of visible.slice(0, 60)) {
    const where = emoji.guild?.id === guild.id ? "este servidor" : `servidor "${emoji.guild?.name ?? "?"}"`;
    console.log(`[Techs]   :${emoji.name}: -> "${normalizeName(emoji.name)}" (${where})`);
  }

  if (visible.length > 60) {
    console.log(`[Techs]   ... e mais ${visible.length - 60}.`);
  }
}

/**
 * A lista de techs é todo cargo posicionado entre os dois cargos separadores.
 * Nada vem de array fixo: criar, renomear, reordenar ou apagar um cargo no
 * Discord já muda o painel.
 */
function resolveTechRoles(guild) {
  const startId = process.env.TECHS_ROLE_START_ID;
  const endId = process.env.TECHS_ROLE_END_ID;

  if (!startId || !endId) {
    console.error("[Techs] ✗ TECHS_ROLE_START_ID e/ou TECHS_ROLE_END_ID não configurados.");
    logRoleReference(guild);
    return [];
  }

  const start = guild.roles.cache.get(startId);
  const end = guild.roles.cache.get(endId);

  if (!start || !end) {
    console.error(
      `[Techs] ✗ Cargo separador não encontrado (início: ${start ? "ok" : startId}, fim: ${end ? "ok" : endId}).`
    );
    logRoleReference(guild);
    return [];
  }

  if (start.position <= end.position) {
    console.error(
      `[Techs] ✗ Separadores invertidos: "${start.name}" (position ${start.position}) precisa estar acima de "${end.name}" (position ${end.position}).`
    );
    return [];
  }

  const me = guild.members.me;

  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    console.error("[Techs] ✗ O bot não tem a permissão Gerenciar Cargos. Nenhum botão funcionaria.");
    return [];
  }

  const botTopRole = me.roles.highest;

  const candidates = [...guild.roles.cache.values()]
    .filter((role) => role.position < start.position && role.position > end.position)
    .sort((a, b) => b.position - a.position);

  const techs = [];
  const skipped = [];

  for (const role of candidates) {
    if (role.id === guild.id) continue;

    if (role.managed) {
      skipped.push(`"${role.name}" é gerenciado por uma integração e não pode ser atribuído`);
      continue;
    }

    if (role.comparePositionTo(botTopRole) >= 0) {
      skipped.push(
        `"${role.name}" está acima de "${botTopRole.name}" na hierarquia, o bot não consegue atribuí-lo`
      );
      continue;
    }

    techs.push({ role, emoji: resolveEmoji(guild, role) });
  }

  for (const reason of skipped) {
    console.warn(`[Techs] ⚠ Botão omitido: ${reason}.`);
  }

  const withoutEmoji = techs.filter((tech) => !tech.emoji).map((tech) => tech.role.name);
  if (withoutEmoji.length) {
    console.warn(
      `[Techs] ⚠ Sem emoji correspondente no servidor, botão vai sem ícone: ${withoutEmoji.join(", ")}.`
    );
    logEmojiReference(guild, withoutEmoji);
  }

  if (techs.length > MAX_TECHS) {
    console.warn(
      `[Techs] ⚠ ${techs.length} cargos no bloco, mas o limite do Components V2 é ${MAX_TECHS}. Os excedentes foram cortados.`
    );
    techs.length = MAX_TECHS;
  }

  console.log(
    `[Techs] ✓ ${techs.length} tech(s) entre "${start.name}" e "${end.name}": ${techs
      .map((tech) => tech.role.name)
      .join(", ")}.`
  );

  return techs;
}

function createTechsLayoutV2(techs, hasBanner) {
  const components = [];
  const container = new ContainerBuilder().setAccentColor(parseInt(process.env.MAIN_COLOR));

  const text1 = new TextDisplayBuilder().setContent("# Painel de Tecnologias");
  const text2 = new TextDisplayBuilder().setContent(
    "### Selecione abaixo as tecnologias com as quais você se identifica."
  );
  const text3 = new TextDisplayBuilder().setContent(
    "Cada botão **adiciona** ou **remove** o cargo referente à tecnologia escolhida.\nOs cargos aparecem no seu perfil e destacam suas preferências.\n"
  );

  // Sem o banner disponível o painel vai só com texto: referenciar um
  // attachment:// que não foi enviado faria o Discord rejeitar a mensagem.
  if (hasBanner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems([{ media: { url: bannerReference(BANNER_NAME) } }])
    );
  }

  container.addTextDisplayComponents(text1, text2, text3);
  components.push(container);

  const separator = new SeparatorBuilder()
    .setSpacing(SeparatorSpacingSize.Small)
    .setDivider(true);
  components.push(separator);

  for (let i = 0; i < techs.length; i += 5) {
    const techGroup = techs.slice(i, i + 5);
    const row = new ActionRowBuilder();

    techGroup.forEach(({ role, emoji }) => {
      const button = new ButtonBuilder()
        .setCustomId(`tech_${role.id}`)
        .setLabel(role.name)
        .setStyle(ButtonStyle.Secondary);

      if (emoji) button.setEmoji(emoji);

      row.addComponents(button);
    });

    components.push(row);
  }

  return components;
}

async function handleTechButtonClick(interaction) {
  const customId = interaction.customId;
  if (!customId.startsWith("tech_")) return;

  const roleId = customId.slice("tech_".length);

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (err) {
    if (err.code === 10062) {
      console.log(`[Techs] Interação expirada para o cargo ${roleId}, ignorando.`);
      return;
    }
    throw err;
  }

  const respond = async (content) => {
    const container = new ContainerBuilder()
      .setAccentColor(parseInt(process.env.MAIN_COLOR))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

    await interaction
      .editReply({ flags: MessageFlags.IsComponentsV2, components: [container] })
      .catch(() => { });
  };

  // Revalida o escopo: o cargo pode ter saído do bloco, perdido a hierarquia ou
  // sido apagado depois de o painel ter sido renderizado.
  const tech = resolveTechRoles(interaction.guild).find((item) => item.role.id === roleId);

  if (!tech) {
    console.warn(`[Techs] ⚠ Clique em cargo fora do bloco de techs (${roleId}). Ignorado.`);
    await respond("Este botão não está mais disponível. O painel será atualizado em instantes.");
    return;
  }

  try {
    const member = interaction.member;
    const hasRole = member.roles.cache.has(tech.role.id);

    if (hasRole) {
      await removeRole(member, tech.role.id);
    } else {
      await setRole(member, tech.role.id);
    }

    console.log(
      `[Techs] ✓ "${tech.role.name}" ${hasRole ? "removido de" : "adicionado a"} ${member.user.tag}.`
    );

    await respond(
      hasRole
        ? `Cargo ${tech.role} removido do seu perfil.`
        : `Cargo ${tech.role} adicionado ao seu perfil.`
    );
  } catch (error) {
    console.error(`[Techs] ✗ Erro ao lidar com "${tech.role.name}" para ${interaction.user.tag}:`, error);
    await respond("Ocorreu um erro ao processar sua ação.");
  }
}

async function renderTechsPanel(client) {
  const techsChannel = await client.channels.fetch(process.env.TECHS_CHANNEL_ID);
  const guild = techsChannel.guild;

  if (!channelWebhook) {
    console.log("[Techs] Buscando/criando webhook do canal...");
    const webhooks = await techsChannel.fetchWebhooks();
    channelWebhook = webhooks.find((wh) => wh.owner?.id === client.user.id);

    if (!channelWebhook) {
      channelWebhook = await techsChannel.createWebhook({ name: client.user.username });
      console.log(`[Techs] ✓ Webhook criado: ${channelWebhook.id}`);
    } else {
      console.log(`[Techs] ✓ Webhook encontrado: ${channelWebhook.id}`);
    }
  }

  if (!panelMessageId) {
    const messages = await techsChannel.messages.fetch({ limit: 50 });
    const existing = messages.find((message) => message.webhookId === channelWebhook.id);
    if (existing) {
      panelMessageId = existing.id;
      console.log(`[Techs] ✓ Painel anterior encontrado: ${panelMessageId}`);
    }
  }

  const techs = resolveTechRoles(guild);

  if (!techs.length) {
    console.error("[Techs] ✗ Nenhuma tech resolvida. O painel não foi alterado.");
    return;
  }

  const banner = await getPanelBanner(BANNER_URL, BANNER_NAME);
  const components = createTechsLayoutV2(techs, Boolean(banner));

  if (panelMessageId) {
    try {
      await channelWebhook.editMessage(panelMessageId, {
        components,
        files: banner ? [banner] : [],
        attachments: [],
        flags: MessageFlags.IsComponentsV2,
      });
      console.log("[Techs] ✓ Painel atualizado.");
      return;
    } catch (err) {
      if (err.code !== 10008) throw err;
      console.log("[Techs] Painel anterior não existe mais. Enviando novo...");
      panelMessageId = null;
    }
  }

  const message = await channelWebhook.send({
    username: "Escolha suas tecnologias",
    avatarURL: "https://i.postimg.cc/d1hG6tLd/lightning-fill.png",
    components,
    files: banner ? [banner] : [],
    flags: MessageFlags.IsComponentsV2,
  });

  panelMessageId = message.id;
  console.log(`[Techs] ✓ Painel enviado. ID: ${panelMessageId}`);
}

async function sendTechLayoutMessage(client) {
  try {
    console.log(`[Techs] Buscando canal ${process.env.TECHS_CHANNEL_ID}...`);
    await renderTechsPanel(client);
  } catch (error) {
    console.error("[Techs] ✗ Erro ao enviar painel:", error);
  }
}

/**
 * Re-renderiza o painel quando cargos ou emojis mudam. Mexer em vários cargos
 * seguidos dispara vários eventos, então o debounce evita reeditar a mensagem
 * uma vez por alteração.
 */
function watchTechRoles(client) {
  const scheduleRefresh = (reason) => {
    console.log(
      `[Techs] Mudança detectada (${reason}). Painel será atualizado em ${REFRESH_DEBOUNCE_MS / 1000}s.`
    );
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(async () => {
      try {
        await renderTechsPanel(client);
      } catch (error) {
        console.error("[Techs] ✗ Erro ao atualizar painel:", error);
      }
    }, REFRESH_DEBOUNCE_MS);
  };

  client.on(Events.GuildRoleCreate, (role) => scheduleRefresh(`cargo "${role.name}" criado`));
  client.on(Events.GuildRoleDelete, (role) => scheduleRefresh(`cargo "${role.name}" apagado`));
  client.on(Events.GuildRoleUpdate, (_oldRole, newRole) => scheduleRefresh(`cargo "${newRole.name}" alterado`));
  client.on(Events.GuildEmojiCreate, (emoji) => scheduleRefresh(`emoji "${emoji.name}" criado`));
  client.on(Events.GuildEmojiDelete, (emoji) => scheduleRefresh(`emoji "${emoji.name}" apagado`));
  client.on(Events.GuildEmojiUpdate, (_oldEmoji, newEmoji) => scheduleRefresh(`emoji "${newEmoji.name}" alterado`));

  console.log("[Techs] ✓ Observando mudanças de cargos e emojis.");
}

module.exports = {
  handleTechButtonClick,
  sendTechLayoutMessage,
  watchTechRoles,
};
