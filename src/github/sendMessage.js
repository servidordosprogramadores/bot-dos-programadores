const {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
require("dotenv").config();

let channelWebhook = null;

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

    console.log("[GitHub] Limpando mensagens anteriores...");
    const messages = await channel.messages.fetch({ limit: 100 });
    if (messages.size > 0) {
      await channel.bulkDelete(messages);
      console.log(`[GitHub] ✓ ${messages.size} mensagem(ns) deletada(s).`);
    } else {
      console.log("[GitHub] Nenhuma mensagem para limpar.");
    }

    const components = [
      new ContainerBuilder()
        .setAccentColor(parseInt(process.env.MAIN_COLOR))
        .addMediaGalleryComponents(
          new MediaGalleryBuilder()
            .addItems(
              new MediaGalleryItemBuilder()
                .setURL("https://i.postimg.cc/MKW4sc5c/github-banner.png"),
            ),
        )
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
          new TextDisplayBuilder().setContent("### Link: https://repositorios.servidordosprogramadores.com"),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("Para adicionar seu perfil, clique no botão **Adicionar GitHub** abaixo."),
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("-# Você precisa ter seu GitHub vinculado ao seu perfil do Discord para continuar."),
        ),
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

    await channelWebhook.send({
      username: "Galeria de GitHubs",
      avatarURL: "https://i.postimg.cc/zG379qKR/github-logo-fill.png",
      components,
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    console.log("[GitHub] ✓ Painel enviado com sucesso!");
  } catch (error) {
    console.error("[GitHub] ✗ Erro ao enviar painel:", error);
  }
}

module.exports = { sendGithubPanel };
