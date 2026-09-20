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
} = require("discord.js");
const { setRole } = require("../techs/setRole");
const { getPanelBanner, bannerReference } = require("../utils/panelBanner");
require("dotenv").config();

const BANNER_URL = "https://i.postimg.cc/8cXQwVRy/PROGRAMADORES7.png";
const BANNER_NAME = "embassador-banner.png";

let panelMessageId = null;

const GUILD_ID = process.env.GUILD_ID;
const EMBASSADOR_ROLE_ID = process.env.EMBASSADOR_ROLE_ID;

const COOLDOWN_MS = 2 * 60 * 1000;
const cooldowns = new Map();

let channelWebhook = null;

async function getUserProfile(userId) {
  try {
    const response = await fetch(`https://discord.com/api/v10/users/${userId}/profile?with_mutual_guilds=false`, {
      method: "GET",
      headers: { Authorization: process.env.AUTH_TOKEN },
    });

    if (!response.ok) {
      console.error(`[Embassador] Erro ao buscar perfil: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("[Embassador] Falha na requisição de perfil:", error);
    return null;
  }
}

function replyContainer(text) {
  return new ContainerBuilder()
    .setAccentColor(parseInt(process.env.MAIN_COLOR))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

async function handleEmbassadorButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== "verify_profile") return;

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (err) {
    console.error(`[Embassador] ✗ Falha no deferReply. Código: ${err.code}. Mensagem: ${err.message}`);
    if (err.code === 10062) {
      console.log("[Embassador] Interação expirada (10062), ignorando.");
    } else {
      console.error("[Embassador] Erro inesperado no deferReply:", err);
    }
    return;
  }

  const userId = interaction.user.id;
  const now = Date.now();
  const lastUsed = cooldowns.get(userId);

  if (lastUsed && now - lastUsed < COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [replyContainer(`Aguarde ${remainingMinutes} minuto(s) antes de verificar novamente.`)],
    });
    return;
  }

  cooldowns.set(userId, now);

  try {
    const member = interaction.member;

    const role = interaction.guild.roles.cache.get(EMBASSADOR_ROLE_ID);

    if (member.roles.cache.has(EMBASSADOR_ROLE_ID)) {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer(`Você já possui o cargo de ${role}.`)],
      });
      return;
    }

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (member.joinedAt > oneMonthAgo) {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer("Você não está no servidor a pelo menos um mês.")],
      });
      return;
    }

    console.log(`[Embassador] Buscando perfil via API para ${userId}...`);
    const profile = await getUserProfile(userId);

    if (!profile) {
      console.log(`[Embassador] Perfil não retornado para ${userId}. Respondendo com erro...`);
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer("Não foi possível verificar seu perfil. Tente novamente mais tarde.")],
      });
      return;
    }

    const clan = profile?.user?.clan;

    const hasTag =
      clan?.identity_guild_id === GUILD_ID &&
      clan?.identity_enabled === true &&
      clan?.tag === "CODE";

    if (!hasTag) {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer("Você não possui a tag do servidor.")],
      });
      return;
    }

    await setRole(member, EMBASSADOR_ROLE_ID);
    console.log(`[Embassador] ✓ Cargo de embaixador concedido a ${member.user.tag}.`);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [replyContainer(`Cargo ${role} adicionado ao seu perfil.`)],
    });

  } catch (error) {
    console.error(`[Embassador] ✗ Erro inesperado para ${interaction.user.tag}:`, error);
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [replyContainer("Ocorreu um erro ao processar sua verificação. Tente novamente mais tarde.")],
    }).catch((e) => console.error("[Embassador] ✗ Falha também no editReply de erro:", e));
  }
}

async function sendEmbassadorPanel(client) {
  try {
    const channelId = process.env.EMBASSADOR_CHANNEL_ID;
    console.log(`[Embassador] Buscando canal ${channelId}...`);
    const channel = await client.channels.fetch(channelId);
    console.log(`[Embassador] ✓ Canal encontrado: #${channel.name}`);

    console.log("[Embassador] Buscando/criando webhook do canal...");
    const webhooks = await channel.fetchWebhooks();
    channelWebhook = webhooks.find((wh) => wh.owner?.id === client.user.id);
    if (!channelWebhook) {
      channelWebhook = await channel.createWebhook({ name: client.user.username });
      console.log(`[Embassador] ✓ Webhook criado: ${channelWebhook.id}`);
    } else {
      console.log(`[Embassador] ✓ Webhook encontrado: ${channelWebhook.id}`);
    }

    if (!panelMessageId) {
      console.log("[Embassador] Procurando painel anterior...");
      const messages = await channel.messages.fetch({ limit: 50 });
      const existing = messages.find((message) => message.webhookId === channelWebhook.id);
      if (existing) {
        panelMessageId = existing.id;
        console.log(`[Embassador] ✓ Painel anterior encontrado: ${panelMessageId}`);
      } else {
        console.log("[Embassador] Nenhum painel anterior. Um novo será enviado.");
      }
    }

    const components = [
      new ContainerBuilder()
        .setAccentColor(1722367)
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(bannerReference(BANNER_NAME)),
          ),
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Torne-se um embaixador"))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("Aqui no **Servidor dos Programadores** temos um sistema de **embaixadores**, membros que ajudam a divulgar e fortalecer nossa comunidade."))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("Para ganhar o cargo <@&1409756076794187846> você deve ser membro do servidor há **pelo menos 1 mês** e utilizar a **tag do servidor** no seu perfil."))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("Esta é a tag do servidor atualmente:"))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("# <:tag:1456035378044600501> CODE"))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("Para receber o seu cargo basta clicar no botão abaixo que o bot verificará o seu perfil."))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("-# Se você retirar a tag do servidor você perderá o cargo.")),
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel("Ganhar cargo")
          .setCustomId("verify_profile"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Como colocar a tag do servidor?")
          .setURL("https://support.discord.com/hc/pt-br/articles/31444248479639-Tags-do-servidor#h_01JT6VKRACHQADX7EBXR84QTAQ"),
      ),
    ];

    if (panelMessageId) {
      try {
        await channelWebhook.editMessage(panelMessageId, {
          components,
          files: [await getPanelBanner(BANNER_URL, BANNER_NAME)],
          attachments: [],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
        console.log("[Embassador] ✓ Painel atualizado.");
        return;
      } catch (err) {
        if (err.code !== 10008) throw err;
        console.log("[Embassador] Painel anterior não existe mais. Enviando novo...");
        panelMessageId = null;
      }
    }

    const message = await channelWebhook.send({
      username: "Painel de embaixador",
      avatarURL: "https://i.postimg.cc/dtSYgych/leaf-fill.png",
      components,
      files: [await getPanelBanner(BANNER_URL, BANNER_NAME)],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    panelMessageId = message.id;
    console.log(`[Embassador] ✓ Painel enviado. ID: ${panelMessageId}`);
  } catch (error) {
    console.error("[Embassador] ✗ Erro ao enviar painel:", error);
  }
}

module.exports = { sendEmbassadorPanel, handleEmbassadorButton };
