const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { getPanelBanner, bannerReference } = require("../utils/panelBanner");
require("dotenv").config();

let channelWebhook = null;
let panelMessageId = null;

const BANNER_URL = "https://i.postimg.cc/MKW4sc5c/github-banner.png";
const BANNER_NAME = "github-banner.png";

async function sendGithubPanel(client) {
  try {
    const channelId = process.env.GITHUB_CHANNEL_ID;
    console.log(`[GitHub] Buscando canal ${channelId}...`);
    const channel = await client.channels.fetch(channelId);
    console.log(`[GitHub] ✓ Canal encontrado: #${channel.name}`);

    console.log("[GitHub] Buscando/criando webhook do canal...");
    const webhooks = await channel.fetchWebhooks();
    channelWebhook = webhooks.find((wh) => wh.owner?.id === client.user.id);
    if (!channelWebhook) {
      channelWebhook = await channel.createWebhook({ name: "Galeria de GitHubs" });
      console.log(`[GitHub] ✓ Webhook criado: ${channelWebhook.id}`);
    } else {
      console.log(`[GitHub] ✓ Webhook encontrado: ${channelWebhook.id}`);
    }

    if (!panelMessageId) {
      console.log("[GitHub] Procurando painel anterior...");
      const messages = await channel.messages.fetch({ limit: 50 });
      const existing = messages.find((message) => message.webhookId === channelWebhook.id);
      if (existing) {
        panelMessageId = existing.id;
        console.log(`[GitHub] ✓ Painel anterior encontrado: ${panelMessageId}`);
      } else {
        console.log("[GitHub] Nenhum painel anterior. Um novo será enviado.");
      }
    }

    const banner = await getPanelBanner(BANNER_URL, BANNER_NAME);

    const panelContainer = new ContainerBuilder()
      .setAccentColor(parseInt(process.env.MAIN_COLOR));

    // Sem o banner disponível o painel vai só com texto: referenciar um
    // attachment:// que não foi enviado faria o Discord rejeitar a mensagem.
    if (banner) {
      panelContainer.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(bannerReference(BANNER_NAME)),
        ),
      );
    }

    const components = [
      panelContainer
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("# Galeria de GitHubs dos membros"),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Quer mostrar seu perfil do **GitHub** para a comunidade?"),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Temos uma galeria com os perfis do GitHub da galera do servidor, onde todo mundo pode conhecer novos devs, ver projetos, acompanhar repositórios e se conectar!"),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("### Link: https://galeria.servidordosprogramadores.com/"),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Para adicionar seu perfil, clique no botão **Adicionar GitHub** abaixo."),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("-# Você precisa ter seu GitHub vinculado ao seu perfil do Discord para continuar."),
        ),
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel("Adicionar GitHub")
            .setCustomId("add_github_button"),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Danger)
            .setLabel("Remover GitHub")
            .setCustomId("remove_github_button"),
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Como vincular o GitHub ao Discord?")
            .setURL("https://support.discord.com/hc/pt-br/articles/8063233404823-Conex%C3%B5es-e-Pap%C3%A9is-Vinculados-Membros-da-Comunidade#h_01GK285ENTCX37J9PYCM1ADXCH"),
        ),
    ];

    if (panelMessageId) {
      try {
        await channelWebhook.editMessage(panelMessageId, {
          components,
          files: banner ? [banner] : [],
          attachments: [],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
        console.log("[GitHub] ✓ Painel atualizado.");
        return;
      } catch (err) {
        if (err.code !== 10008) throw err;
        console.log("[GitHub] Painel anterior não existe mais. Enviando novo...");
        panelMessageId = null;
      }
    }

    const message = await channelWebhook.send({
      username: "Galeria de GitHubs",
      avatarURL: "https://i.postimg.cc/zG379qKR/github-logo-fill.png",
      components,
      files: banner ? [banner] : [],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    panelMessageId = message.id;
    console.log(`[GitHub] ✓ Painel enviado. ID: ${panelMessageId}`);
  } catch (error) {
    console.error("[GitHub] ✗ Erro ao enviar painel:", error);
  }
}

module.exports = { sendGithubPanel };
