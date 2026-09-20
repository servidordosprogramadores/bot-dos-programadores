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
const { resolveRoleBlock } = require("../utils/roleBlock");
const { watchRoleChanges } = require("../utils/roleWatcher");
require("dotenv").config();

let channelWebhook = null;
let panelMessageId = null;

const BANNER_URL = "https://i.postimg.cc/hvg8Zpn8/PROGRAMADORES4.png";
const BANNER_NAME = "colors-banner.png";

// Um select menu aceita 25 opções, e uma delas é sempre a de remover a cor.
const MAX_COLORS = 24;

const REMOVE_OPTION_VALUE = "remove_color_option";

/**
 * Hoje é um bloco só, com todas as cores liberadas, e a ordem do painel é a
 * ordem da hierarquia: para reordenar, basta arrastar os cargos no Discord.
 *
 * O painel já foi dividido em três grupos — padrões, especiais (as cores do
 * Discord: Bravery, Balance, Brilliance e Discord) e premium, essa última
 * exigindo um cargo de permissão. Se um dia os grupos voltarem, a forma é
 * acrescentar cargos separadores dentro do bloco e resolver um intervalo por
 * grupo, em vez de reintroduzir a lista fixa em código.
 */
function resolveColorRoles(guild) {
  return resolveRoleBlock(guild, {
    label: "Colors",
    startId: process.env.COLORS_ROLE_START_ID,
    endId: process.env.COLORS_ROLE_END_ID,
    startVar: "COLORS_ROLE_START_ID",
    endVar: "COLORS_ROLE_END_ID",
    max: MAX_COLORS,
  });
}

function createColorSelectMenuV2(colorRoles) {
  const options = [
    new StringSelectMenuOptionBuilder()
      .setLabel("Remover Cor")
      .setValue(REMOVE_OPTION_VALUE),
    ...colorRoles.map((role) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(role.name)
        .setValue(`color_${role.id}`)
    ),
  ];

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("color_select")
    .setPlaceholder("Escolha uma cor ou remova a atual")
    .addOptions(options);

  return new ActionRowBuilder().addComponents(selectMenu);
}

function createColorsContainerV2(colorRoles, hasBanner) {
  const components = [];
  const container = new ContainerBuilder().setAccentColor(parseInt(process.env.MAIN_COLOR));

  const text1 = new TextDisplayBuilder().setContent("# Painel de Cores");
  const text2 = new TextDisplayBuilder().setContent(
    "### Selecione abaixo a sua cor preferida."
  );
  const text3 = new TextDisplayBuilder().setContent(
    "Use o menu de seleção para **adicionar** ou **remover** uma cor. A cor aparece no seu perfil e destaca seu nome no servidor."
  );

  // A lista sai dos próprios cargos, então não há IDs escritos à mão para
  // ficarem desatualizados quando uma cor é criada ou removida.
  const text4 = new TextDisplayBuilder().setContent(
    `### Cores disponíveis:\n- ${colorRoles.map((role) => `<@&${role.id}>`).join(", ")}.`
  );

  // Sem o banner disponível o painel vai só com texto: referenciar um
  // attachment:// que não foi enviado faria o Discord rejeitar a mensagem.
  if (hasBanner) {
    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems([{ media: { url: bannerReference(BANNER_NAME) } }])
    );
  }

  container.addTextDisplayComponents(text1, text2, text3, text4);
  components.push(container);

  const separator = new SeparatorBuilder()
    .setSpacing(SeparatorSpacingSize.Small)
    .setDivider(true);
  components.push(separator);

  components.push(createColorSelectMenuV2(colorRoles));

  return components;
}

function replyContainer(text) {
  return new ContainerBuilder()
    .setAccentColor(parseInt(process.env.MAIN_COLOR))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
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

  const respond = async (text) => {
    await interaction
      .editReply({ flags: MessageFlags.IsComponentsV2, components: [replyContainer(text)] })
      .catch((error) => console.error("[Colors] Erro ao responder:", error));
  };

  try {
    // Revalida o escopo a cada clique: o cargo pode ter saído do bloco ou sido
    // apagado depois de o painel ter sido renderizado.
    const colorRoles = resolveColorRoles(interaction.guild);

    if (selectedValue === REMOVE_OPTION_VALUE) {
      let removedCount = 0;
      for (const role of colorRoles) {
        if (member.roles.cache.has(role.id)) {
          await removeRole(member, role.id);
          removedCount++;
        }
      }

      console.log(`[Colors] ${removedCount} cargo(s) de cor removido(s) de ${member.user.tag}.`);
      await respond(removedCount > 0 ? "Sua cor foi removida." : "Você não possui uma cor para remover.");
      return;
    }

    const roleId = selectedValue.slice("color_".length);
    const selectedRole = colorRoles.find((role) => role.id === roleId);

    if (!selectedRole) {
      console.warn(`[Colors] ⚠ Cor fora do bloco selecionada (${roleId}). Ignorada.`);
      await respond("Esta cor não está mais disponível. O painel será atualizado em instantes.");
      return;
    }

    // Cor é exclusiva: tira as outras antes de aplicar a escolhida.
    for (const role of colorRoles) {
      if (role.id !== selectedRole.id && member.roles.cache.has(role.id)) {
        await removeRole(member, role.id);
      }
    }

    if (!member.roles.cache.has(selectedRole.id)) {
      await setRole(member, selectedRole.id);
    }

    console.log(`[Colors] ✓ Cor "${selectedRole.name}" aplicada para ${member.user.tag}.`);
    await respond(`Cargo ${selectedRole} adicionado ao seu perfil.`);
  } catch (error) {
    console.error(`[Colors] ✗ Erro ao gerenciar cor para ${member.user.tag}:`, error);
    await respond("Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.");
  }
}

async function renderColorsPanel(client) {
  const colorsChannel = await client.channels.fetch(process.env.COLORS_CHANNEL_ID);
  const guild = colorsChannel.guild;

  if (!channelWebhook) {
    console.log("[Colors] Buscando/criando webhook do canal...");
    const webhooks = await colorsChannel.fetchWebhooks();
    channelWebhook = webhooks.find((wh) => wh.owner?.id === client.user.id);

    if (!channelWebhook) {
      channelWebhook = await colorsChannel.createWebhook({ name: client.user.username });
      console.log(`[Colors] ✓ Webhook criado: ${channelWebhook.id}`);
    } else {
      console.log(`[Colors] ✓ Webhook encontrado: ${channelWebhook.id}`);
    }
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

  const colorRoles = resolveColorRoles(guild);

  if (!colorRoles.length) {
    console.error("[Colors] ✗ Nenhuma cor resolvida. O painel não foi alterado.");
    return;
  }

  const banner = await getPanelBanner(BANNER_URL, BANNER_NAME);
  const components = createColorsContainerV2(colorRoles, Boolean(banner));

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
}

async function sendColorEmbed(client) {
  try {
    console.log(`[Colors] Buscando canal ${process.env.COLORS_CHANNEL_ID}...`);
    await renderColorsPanel(client);
  } catch (error) {
    console.error("[Colors] ✗ Erro ao enviar painel:", error);
  }
}

function watchColorRoles(client) {
  watchRoleChanges(client, "Colors", renderColorsPanel);
}

module.exports = {
  handleColorSelectClick,
  sendColorEmbed,
  watchColorRoles,
};
