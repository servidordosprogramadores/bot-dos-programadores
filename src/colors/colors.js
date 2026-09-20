const {
  TextDisplayBuilder,
  MessageFlags,
  ContainerBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MediaGalleryBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
} = require("discord.js");
const { setRole } = require("../techs/setRole");
const { removeRole } = require("../techs/removeRole");
const { getPanelBanner, bannerReference } = require("../utils/panelBanner");
require("dotenv").config();

let channelWebhook = null;
let panelMessageId = null;

const BANNER_URL = "https://i.postimg.cc/hvg8Zpn8/PROGRAMADORES4.png";
const BANNER_NAME = "colors-banner.png";

const PREMIUM_PERMISSION_ROLE_IDS = [
  process.env.CRIADOR_ROLE_ID,
  process.env.PARCEIRO_ROLE_ID,
  process.env.BOOSTER_ROLE_ID,
  process.env.VIRAL_ROLE_ID,
  process.env.ATIVO_ROLE_ID,
  process.env.AMIGO_ROLE_ID,
].filter(Boolean);

const COLORS = [
  // Cores Padrões
  {
    name: "Preto",
    roleId: process.env.PRETO_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },
  {
    name: "Branco",
    roleId: process.env.BRANCO_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },
  {
    name: "Azul",
    roleId: process.env.AZUL_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },
  {
    name: "Ciano",
    roleId: process.env.CIANO_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },
  {
    name: "Verde",
    roleId: process.env.VERDE_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },
  {
    name: "Amarelo",
    roleId: process.env.AMARELO_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },
  {
    name: "Vermelho",
    roleId: process.env.VERMELHO_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },
  {
    name: "Roxo",
    roleId: process.env.ROXO_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },
  {
    name: "Rosa",
    roleId: process.env.ROSA_ROLE_ID,
    isPremium: false,
    isDiscordColor: false,
  },

  // Cores Especiais
  {
    name: "Discord",
    roleId: process.env.DISCORD_BLUE_ROLE_ID,
    isPremium: false,
    isDiscordColor: true,
  },
  {
    name: "Bravery",
    roleId: process.env.BRAVERY_ROLE_ID,
    isPremium: false,
    isDiscordColor: true,
  },
  {
    name: "Balance",
    roleId: process.env.BALANCE_ROLE_ID,
    isPremium: false,
    isDiscordColor: true,
  },
  {
    name: "Brilliance",
    roleId: process.env.BRILLIANCE_ROLE_ID,
    isPremium: false,
    isDiscordColor: true,
  },

  // Cores Premium
  {
    name: "Holográfico",
    roleId: process.env.HOLOGRAFICO_ROLE_ID,
    isPremium: true,
    isDiscordColor: false,
  },
  {
    name: "Gradiente Azul",
    roleId: process.env.GRADIENTE_AZUL_ROLE_ID,
    isPremium: true,
    isDiscordColor: false,
  },
  {
    name: "Gradiente Verde",
    roleId: process.env.GRADIENTE_VERDE_ROLE_ID,
    isPremium: true,
    isDiscordColor: false,
  },
  {
    name: "Gradiente Amarelo",
    roleId: process.env.GRADIENTE_AMARELO_ROLE_ID,
    isPremium: true,
    isDiscordColor: false,
  },
  {
    name: "Gradiente Vermelho",
    roleId: process.env.GRADIENTE_VEREMELHO_ROLE_ID,
    isPremium: true,
    isDiscordColor: false,
  },
  {
    name: "Gradiente Roxo",
    roleId: process.env.GRADIENTE_ROXO_ROLE_ID,
    isPremium: true,
    isDiscordColor: false,
  },
  {
    name: "Gradiente Rosa",
    roleId: process.env.GRADIENTE_ROSA_ROLE_ID,
    isPremium: true,
    isDiscordColor: false,
  },
];

function createColorSelectMenuV2() {
  const removeColorOption = new StringSelectMenuOptionBuilder()
    .setLabel("Remover Cor")
    .setValue("remove_color_option");

  const colorOptions = COLORS.filter((c) => c.roleId).map((color) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(color.name)
      .setValue(`color_${color.name.toLowerCase().replace(/\s/g, "")}`)
  );

  const options = [removeColorOption, ...colorOptions];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("color_select")
    .setPlaceholder("Escolha uma cor ou remova a atual")
    .addOptions(options);

  return new ActionRowBuilder().addComponents(selectMenu);
}

function createColorsContainerV2(hasBanner) {
  const components = [];
  const container = new ContainerBuilder().setAccentColor(parseInt(process.env.MAIN_COLOR));

  const text1 = new TextDisplayBuilder().setContent("# Painel de Cores");
  const text2 = new TextDisplayBuilder().setContent(
    "### Selecione abaixo a sua cor preferida."
  );
  const text3 = new TextDisplayBuilder().setContent(
    "Use o menu de seleção para **adicionar** ou **remover** uma cor. A cor aparece no seu perfil e destaca seu nome no servidor."
  );

  const text4 = new TextDisplayBuilder().setContent(
    `### Cores padrões:\n- <@&1381471316934266932>, <@&1381471416280682517>, <@&1381471984428253255>, <@&1381471512401547345>, <@&1381471925187907644>, <@&1381471816660422666>, <@&1381471983799111791>, <@&1381471579287847002>, <@&1381471716462694502>.`
  );

  const text5 = new TextDisplayBuilder().setContent(
    `### Cores especiais:\n- <@&1381442335468032050>, <@&1381442379994763285>, <@&1381442246922211338>, <@&1381442273237008495>.`
  );

  const text6 = new TextDisplayBuilder().setContent(
    `### Cores premium:\n- <@&1381754982876971008>, <@&1381755628883677184>, <@&1381755715584004227>, <@&1381755759187988591>, <@&1381755389485383770>, <@&1381755107753988146>, <@&1381755913987162163>.`
  );

  // Sem o banner disponível o painel vai só com texto: referenciar um
  // attachment:// que não foi enviado faria o Discord rejeitar a mensagem.
  if (hasBanner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems([{ media: { url: bannerReference(BANNER_NAME) } }])
    );
  }

  container.addTextDisplayComponents(text1, text2, text3, text4, text5, text6);
  components.push(container);

  const separator = new SeparatorBuilder()
    .setSpacing(SeparatorSpacingSize.Small)
    .setDivider(true);
  components.push(separator);

  const selectMenuRow = createColorSelectMenuV2();
  components.push(selectMenuRow);

  return components;
}

async function handleColorSelectClick(interaction) {
  if (
    !interaction.isStringSelectMenu() ||
    interaction.customId !== "color_select"
  )
    return;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (err) {
    if (err.code === 10062) {
      console.log("[Colors] Interação expirada, ignorando.");
      return;
    }
    throw err;
  }

  const selectedValue = interaction.values[0];
  const member = interaction.member;
  console.log(`[Colors] ${member.user.tag} selecionou: "${selectedValue}"`);

  try {
    if (selectedValue === "remove_color_option") {
      let removedCount = 0;
      for (const color of COLORS) {
        if (color.roleId && member.roles.cache.has(color.roleId)) {
          await removeRole(member, color.roleId);
          removedCount++;
        }
      }
      console.log(`[Colors] ${removedCount} cargo(s) de cor removido(s) de ${member.user.tag}.`);

      const msg =
        removedCount > 0
          ? "Sua cor foi removida."
          : "Você não possui uma cor para remover.";

      const container = new ContainerBuilder()
        .setAccentColor(parseInt(process.env.MAIN_COLOR))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(msg));

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } else {
      const colorName = selectedValue.replace("color_", "");
      const selectedColor = COLORS.find(
        (c) => c.roleId && c.name.toLowerCase().replace(/\s/g, "") === colorName
      );

      if (!selectedColor) {
        const container = new ContainerBuilder()
          .setAccentColor(parseInt(process.env.MAIN_COLOR))
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("Cor inválida selecionada ou não encontrada.")
          );
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
        });
        return;
      }

      if (selectedColor.isPremium) {
        const hasPermission = PREMIUM_PERMISSION_ROLE_IDS.some(
          (permissionRoleId) => member.roles.cache.has(permissionRoleId)
        );

        if (!hasPermission) {
          let permissionRolesMentions = "";
          if (PREMIUM_PERMISSION_ROLE_IDS.length > 0) {
            permissionRolesMentions = PREMIUM_PERMISSION_ROLE_IDS.map(
              (id) => `<@&${id}>`
            ).join(", ");
            if (PREMIUM_PERMISSION_ROLE_IDS.length > 1) {
              const lastCommaIndex = permissionRolesMentions.lastIndexOf(", ");
              permissionRolesMentions =
                permissionRolesMentions.substring(0, lastCommaIndex) +
                " ou " +
                permissionRolesMentions.substring(lastCommaIndex + 2);
            }
          }

          const container = new ContainerBuilder()
            .setAccentColor(parseInt(process.env.MAIN_COLOR))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `Para selecionar uma **cor premium**, você precisa possuir um dos seguintes cargos: ${permissionRolesMentions}.`
              )
            );
          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [container],
          });
          return;
        }
      }

      for (const color of COLORS) {
        if (
          color.roleId &&
          member.roles.cache.has(color.roleId) &&
          color.roleId !== selectedColor.roleId
        ) {
          await removeRole(member, color.roleId);
        }
      }

      if (!member.roles.cache.has(selectedColor.roleId)) {
        await setRole(member, selectedColor.roleId);
      }

      const role = interaction.guild.roles.cache.get(selectedColor.roleId);
      console.log(`[Colors] ✓ Cor "${selectedColor.name}" aplicada para ${member.user.tag}.`);
      const container = new ContainerBuilder()
        .setAccentColor(parseInt(process.env.MAIN_COLOR))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`Cargo ${role} adicionado ao seu perfil.`)
        );
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    }
  } catch (error) {
    console.error(`[Colors] ✗ Erro ao gerenciar cor para ${member.user.tag}:`, error);
    const container = new ContainerBuilder()
      .setAccentColor(parseInt(process.env.MAIN_COLOR))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.`
        )
      );
    try {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (replyError) {
      console.error("[Colors] Erro ao responder com erro para o usuário:", replyError);
    }
  }
}

async function sendColorEmbed(client) {
  try {
    console.log(`[Colors] Buscando canal ${process.env.COLORS_CHANNEL_ID}...`);
    const colorsChannel = await client.channels.fetch(process.env.COLORS_CHANNEL_ID);
    console.log(`[Colors] ✓ Canal encontrado: #${colorsChannel.name}`);

    console.log("[Colors] Buscando/criando webhook do canal...");
    const webhooks = await colorsChannel.fetchWebhooks();
    channelWebhook = webhooks.find((wh) => wh.owner?.id === client.user.id);
    if (!channelWebhook) {
      channelWebhook = await colorsChannel.createWebhook({ name: client.user.username });
      console.log(`[Colors] ✓ Webhook criado: ${channelWebhook.id}`);
    } else {
      console.log(`[Colors] ✓ Webhook encontrado: ${channelWebhook.id}`);
    }

    if (!panelMessageId) {
      console.log("[Colors] Procurando painel anterior...");
      const messages = await colorsChannel.messages.fetch({ limit: 50 });
      const existing = messages.find((message) => message.webhookId === channelWebhook.id);
      if (existing) {
        panelMessageId = existing.id;
        console.log(`[Colors] ✓ Painel anterior encontrado: ${panelMessageId}`);
      } else {
        console.log("[Colors] Nenhum painel anterior. Um novo será enviado.");
      }
    }

    const banner = await getPanelBanner(BANNER_URL, BANNER_NAME);
    const components = createColorsContainerV2(Boolean(banner));

    if (panelMessageId) {
      try {
        await channelWebhook.editMessage(panelMessageId, {
          components,
          files: banner ? [banner] : [],
          attachments: [],
          flags: MessageFlags.IsComponentsV2,
          allowedMentions: { parse: [] },
        });
        console.log("[Colors] ✓ Painel atualizado.");
        return;
      } catch (err) {
        if (err.code !== 10008) throw err;
        console.log("[Colors] Painel anterior não existe mais. Enviando novo...");
        panelMessageId = null;
      }
    }

    const message = await channelWebhook.send({
      username: "Escolha sua cor",
      avatarURL: "https://i.postimg.cc/jC09KFp5/palette-fill.png",
      components,
      files: banner ? [banner] : [],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { parse: [] },
    });

    panelMessageId = message.id;
    console.log(`[Colors] ✓ Painel enviado. ID: ${panelMessageId}`);
  } catch (error) {
    console.error("[Colors] Erro ao enviar painel:", error);
  }
}

module.exports = {
  COLORS,
  handleColorSelectClick,
  sendColorEmbed,
};
