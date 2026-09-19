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
  AttachmentBuilder,
} = require("discord.js");
const { setRole } = require("./setRole");
const { removeRole } = require("./removeRole");
require("dotenv").config();

let channelWebhook = null;

const BANNER_URL = "https://i.postimg.cc/XJ9cgtR7/PROGRAMADORES5.png";
const BANNER_NAME = "techs-banner.png";

const TECHS = [
  {
    id: "javascript",
    name: "JavaScript",
    emoji: "<:JavaScript:1381370650903445544>",
    roleId: process.env.JAVASCRIPT_ROLE_ID,
  },
  {
    id: "python",
    name: "Python",
    emoji: "<:Python:1381370968374771782>",
    roleId: process.env.PYTHON_ROLE_ID,
  },
  {
    id: "java",
    name: "Java",
    emoji: "<:Java:1381371080526004355>",
    roleId: process.env.JAVA_ROLE_ID,
  },
  {
    id: "clang",
    name: "C",
    emoji: "<:C_:1381371177045327892>",
    roleId: process.env.C_ROLE_ID,
  },
  {
    id: "csharp",
    name: "C#",
    emoji: "<:CSharp:1381371194816856104>",
    roleId: process.env.CSHARP_ROLE_ID,
  },
  {
    id: "cpp",
    name: "C++",
    emoji: "<:CPP:1381371126470676520>",
    roleId: process.env.CPP_ROLE_ID,
  },
  {
    id: "typescript",
    name: "TypeScript",
    emoji: "<:TypeScript:1381370724568141854>",
    roleId: process.env.TYPESCRIPT_ROLE_ID,
  },
  {
    id: "php",
    name: "PHP",
    emoji: "<:PHP:1381371029078933564>",
    roleId: process.env.PHP_ROLE_ID,
  },
  {
    id: "go",
    name: "Go",
    emoji: "<:Go:1381371321950146590>",
    roleId: process.env.GO_ROLE_ID,
  },
  {
    id: "kotlin",
    name: "Kotlin",
    emoji: "<:Kotlin:1381371358054715555>",
    roleId: process.env.KOTLIN_ROLE_ID,
  },
  {
    id: "swift",
    name: "Swift",
    emoji: "<:Swift:1381371449373098094>",
    roleId: process.env.SWIFT_ROLE_ID,
  },
  {
    id: "rust",
    name: "Rust",
    emoji: "<:Rust:1381371519707517009>",
    roleId: process.env.RUST_ROLE_ID,
  },
  {
    id: "html",
    name: "HTML",
    emoji: "<:HTML:1381370851068481647>",
    roleId: process.env.HTML_ROLE_ID,
  },
  {
    id: "css",
    name: "CSS",
    emoji: "<:CSS:1381370901618233344>",
    roleId: process.env.CSS_ROLE_ID,
  },
  {
    id: "discord",
    name: "Discord",
    emoji: "<:Discord:1381371570441814136>",
    roleId: process.env.DISCORD_ROLE_ID,
  },
];

function createTechsLayoutV2() {
  const components = [];
  const container = new ContainerBuilder().setAccentColor(parseInt(process.env.MAIN_COLOR));

  const media = new MediaGalleryBuilder().addItems([
    {
      media: {
        url: `attachment://${BANNER_NAME}`,
      },
    },
  ]);

  const text1 = new TextDisplayBuilder().setContent("# Painel de Tecnologias");
  const text2 = new TextDisplayBuilder().setContent(
    "### Selecione abaixo as tecnologias com as quais você se identifica."
  );
  const text3 = new TextDisplayBuilder().setContent(
    "Cada botão **adiciona** ou **remove** o cargo referente à tecnologia escolhida.\nOs cargos aparecem no seu perfil e destacam suas preferências.\n"
  );

  container.addMediaGalleryComponents(media);
  container.addTextDisplayComponents(text1, text2, text3);
  components.push(container);

  const separator = new SeparatorBuilder()
    .setSpacing(SeparatorSpacingSize.Small)
    .setDivider(true);
  components.push(separator);

  for (let i = 0; i < TECHS.length; i += 5) {
    const techGroup = TECHS.slice(i, i + 5);
    const row = new ActionRowBuilder();

    techGroup.forEach((tech) => {
      const button = new ButtonBuilder()
        .setCustomId(`tech_${tech.id}`)
        .setLabel(tech.name)
        .setEmoji(tech.emoji)
        .setStyle(ButtonStyle.Secondary);

      row.addComponents(button);
    });

    components.push(row);
  }

  return components;
}

async function handleTechButtonClick(interaction) {
  const customId = interaction.customId;
  if (!customId.startsWith("tech_")) return;

  const techId = customId.replace("tech_", "");
  const tech = TECHS.find((t) => t.id === techId);
  if (!tech) return;

  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  } catch (err) {
    if (err.code === 10062) {
      console.log(`[Techs] Interação expirada para "${tech.name}", ignorando.`);
      return;
    }
    throw err;
  }

  try {
    const member = interaction.member;
    const hasRole = member.roles.cache.has(tech.roleId);
    const role = interaction.guild.roles.cache.get(tech.roleId);

    if (hasRole) {
      await removeRole(member, tech.roleId);
    } else {
      await setRole(member, tech.roleId);
    }

    const message = hasRole
      ? `Cargo ${role} removido do seu perfil.`
      : `Cargo ${role} adicionado ao seu perfil.`;
    console.log(`[Techs] ✓ "${tech.name}" ${hasRole ? "removido de" : "adicionado a"} ${member.user.tag}.`);

    const container = new ContainerBuilder()
      .setAccentColor(parseInt(process.env.MAIN_COLOR))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(message));

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  } catch (error) {
    console.error(`[Techs] ✗ Erro ao lidar com "${tech.name}" para ${interaction.user.tag}:`, error);

    const container = new ContainerBuilder()
      .setAccentColor(parseInt(process.env.MAIN_COLOR))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`Ocorreu um erro ao processar sua ação.`)
      );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    }).catch(() => { });
  }
}

async function sendTechLayoutMessage(client) {
  try {
    console.log(`[Techs] Buscando canal ${process.env.TECHS_CHANNEL_ID}...`);
    const techsChannel = await client.channels.fetch(
      process.env.TECHS_CHANNEL_ID
    );
    console.log(`[Techs] ✓ Canal encontrado: #${techsChannel.name}`);

    console.log("[Techs] Buscando/criando webhook do canal...");
    const webhooks = await techsChannel.fetchWebhooks();
    channelWebhook = webhooks.find((wh) => wh.owner?.id === client.user.id);
    if (!channelWebhook) {
      channelWebhook = await techsChannel.createWebhook({ name: client.user.username });
      console.log(`[Techs] ✓ Webhook criado: ${channelWebhook.id}`);
    } else {
      console.log(`[Techs] ✓ Webhook encontrado: ${channelWebhook.id}`);
    }

    console.log("[Techs] Limpando mensagens anteriores...");
    const messages = await techsChannel.messages.fetch({ limit: 10 });
    if (messages.size > 0) {
      try {
        await techsChannel.bulkDelete(messages, true);
        console.log(`[Techs] ✓ ${messages.size} mensagem(ns) deletada(s).`);
      } catch (err) {
        console.error("[Techs] ✗ Falha ao limpar mensagens antigas. Enviando painel mesmo assim:", err);
      }
    } else {
      console.log("[Techs] Nenhuma mensagem para limpar.");
    }

    const components = createTechsLayoutV2();
    const banner = new AttachmentBuilder(BANNER_URL, { name: BANNER_NAME });

    await channelWebhook.send({
      username: "Escolha suas tecnologias",
      avatarURL: "https://i.postimg.cc/d1hG6tLd/lightning-fill.png",
      components,
      files: [banner],
      flags: MessageFlags.IsComponentsV2,
    });

    console.log("[Techs] Painel enviado com sucesso!");
  } catch (error) {
    console.error("[Techs] Erro ao enviar painel:", error);
  }
}

module.exports = {
  TECHS,
  handleTechButtonClick,
  sendTechLayoutMessage,
};
