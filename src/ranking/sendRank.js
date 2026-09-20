const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
  MessageFlags,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { getPanelBanner, bannerReference } = require("../utils/panelBanner");

const TARGET_CHANNEL_ID = process.env.RANKING_CHANNEL_ID;
const BANNER_URL = "https://i.postimg.cc/hGWsSnVf/PRg2.png";
const BANNER_NAME = "ranking-banner.png";

let rankWebhook = null;
let rankMessageId = null;

async function sendRankMessage(client, textRank, voiceRank) {
  console.log(`[Ranking] Buscando canal de ranking ${TARGET_CHANNEL_ID}...`);
  const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
  if (!targetChannel) {
    console.error("[Ranking] Canal alvo não encontrado.");
    return;
  }
  console.log(`[Ranking] ✓ Canal encontrado: #${targetChannel.name}`);

  if (!rankWebhook) {
    console.log("[Ranking] Buscando/criando webhook do canal...");
    const webhooks = await targetChannel.fetchWebhooks();
    rankWebhook = webhooks.find((wh) => wh.owner?.id === client.user.id);
    if (!rankWebhook) {
      rankWebhook = await targetChannel.createWebhook({ name: client.user.username });
      console.log(`[Ranking] ✓ Webhook criado: ${rankWebhook.id}`);
    } else {
      console.log(`[Ranking] ✓ Webhook encontrado: ${rankWebhook.id}`);
    }

    if (!rankMessageId) {
      console.log("[Ranking] Procurando mensagem anterior do webhook...");
      const messages = await targetChannel.messages.fetch({ limit: 50 });
      const existing = messages.find((m) => m.webhookId === rankWebhook.id);
      if (existing) {
        rankMessageId = existing.id;
        console.log(`[Ranking] ✓ Mensagem anterior encontrada: ${rankMessageId}`);
      }
    }
  }

  const banner = await getPanelBanner(BANNER_URL, BANNER_NAME);

  const rankContainer = new ContainerBuilder()
    .setAccentColor(parseInt(process.env.MAIN_COLOR));

  // Sem o banner disponível o ranking vai só com texto: referenciar um
  // attachment:// que não foi enviado faria o Discord rejeitar a mensagem.
  if (banner) {
    rankContainer.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(bannerReference(BANNER_NAME)),
      ),
    );
  }

  const components = [
    rankContainer
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# Ranking dos membros mais ativos"),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("Este ranking destaca os membros mais ativos do servidor, considerando a participação em mensagens, calls e interações ao longo do tempo."),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("### <:chat:1455398639144013907> Mais ativos no chat"),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(textRank),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("### <:microfone:1455398624048578731> Mais ativo em call"),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(voiceRank),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("Obrigado a todos que participam, ajudam e fortalecem nossa comunidade diariamente.\nPara conferir seu nível use o comando `/id`."),
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Ultima atualização: <t:${Math.floor(Date.now() / 1000)}:R> `),
      ),
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Como subir de nível e para que servem?")
          .setURL("https://discord.com/channels/1112920281367973900/1455800215083683881"),
      ),
  ];

  // O banner vem em cache de memória, então reenviá-lo a cada atualização não
  // custa uma nova ida ao postimg.
  const sendOptions = {
    username: "Ranking do servidor",
    avatarURL: "https://i.postimg.cc/4Nt4QjZW/ranking-fill.png",
    components,
    files: banner ? [banner] : [],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  };

  if (rankMessageId) {
    console.log(`[Ranking] Editando mensagem anterior (${rankMessageId})...`);
    try {
      await rankWebhook.editMessage(rankMessageId, {
        components,
        files: banner ? [banner] : [],
        attachments: [],
        flags: MessageFlags.IsComponentsV2,
        allowedMentions: { parse: [] },
      });
      console.log("[Ranking] ✓ Ranking atualizado com sucesso.");
    } catch (err) {
      if (err.code === 10008) {
        console.log("[Ranking] Mensagem anterior não encontrada. Enviando nova...");
        rankMessageId = null;
        const msg = await rankWebhook.send(sendOptions);
        rankMessageId = msg.id;
        console.log(`[Ranking] ✓ Nova mensagem enviada: ${rankMessageId}`);
      } else {
        throw err;
      }
    }
  } else {
    console.log("[Ranking] Enviando nova mensagem de ranking...");
    const msg = await rankWebhook.send(sendOptions);
    rankMessageId = msg.id;
    console.log(`[Ranking] ✓ Ranking enviado com sucesso. ID: ${rankMessageId}`);
  }
}

module.exports = { sendRankMessage };
