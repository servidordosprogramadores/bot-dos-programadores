require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");
const {
  handleTechButtonClick,
  sendTechLayoutMessage,
} = require("./src/techs/techs");
const {
  handleColorSelectClick,
  sendColorEmbed,
} = require("./src/colors/colors");
const { sendSupportEmbed } = require("./src/support/support");
const { handleSupportInteraction } = require("./src/support/resolve");
const { startRandomMessages } = require("./src/extras/sendRandomMessage");
const { sendEmbassadorPanel, handleEmbassadorButton } = require("./src/extras/embassador");
const { sendGithubPanel } = require("./src/github/sendMessage");
const { handleAddGithubButton, handleRemoveGithubButton } = require("./src/github/addGithub");
const { startCronGithub } = require("./src/github/cronGithub");
const ranking = require("./src/ranking/ranking");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot conectado como ${readyClient.user.tag}`);

  try {
    const guild = readyClient.guilds.cache.first();
    if (!guild) {
      console.error("Não foi possível encontrar nenhum servidor");
      return;
    }

    await sendTechLayoutMessage(readyClient);
    await sendColorEmbed(readyClient);
    await sendSupportEmbed(readyClient);
    await sendEmbassadorPanel(readyClient);
    await sendGithubPanel(readyClient);
    startCronGithub(readyClient);
    await startRandomMessages(readyClient);
    ranking(readyClient);
  } catch (error) {
    console.error("Erro ao processar informações do servidor:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      await handleTechButtonClick(interaction);
      await handleSupportInteraction(interaction);
      await handleEmbassadorButton(interaction);
      await handleAddGithubButton(interaction);
      await handleRemoveGithubButton(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleColorSelectClick(interaction);
      await handleSupportInteraction(interaction);
    }
  } catch (error) {
    console.error("[Bot] Erro não tratado em InteractionCreate:", error);
  }
});

client.on("error", (error) => {
  console.error("[Bot] Erro não tratado no client:", error);
});

client
  .login(process.env.BOT_TOKEN)
  .then(() => console.log("Logando..."))
  .catch((error) => {
    console.error("Erro ao fazer login:", error);

  });
