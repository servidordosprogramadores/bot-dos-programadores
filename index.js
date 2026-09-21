require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");
const {
  handleTechButtonClick,
  sendTechLayoutMessage,
  watchTechRoles,
} = require("./src/techs/techs");
const {
  handleColorSelectClick,
  sendColorEmbed,
  watchColorRoles,
} = require("./src/colors/colors");
const { sendSupportEmbed } = require("./src/support/support");
const { handleSupportInteraction } = require("./src/support/resolve");
const { startRandomMessages } = require("./src/extras/sendRandomMessage");
const { sendEmbassadorPanel, handleEmbassadorButton } = require("./src/extras/embassador");
const { sendGithubPanel } = require("./src/github/sendMessage");
const { handleAddGithubButton, handleRemoveGithubButton } = require("./src/github/addGithub");
const { startCronGithub } = require("./src/github/cronGithub");
const { startApi } = require("./src/github/api/index");
const ranking = require("./src/ranking/ranking");
const { trackActivity } = require("./src/ranking/activity");

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

/**
 * Identifica de qual aplicação veio o token que acabou de conectar. Serve para
 * conferir, sem depender de memória, que o bot no ar é o desta conta/Team — e
 * não uma aplicação antiga cujo token tenha vazado.
 */
async function logIdentity(readyClient) {
  try {
    const application = await readyClient.application.fetch();
    const owner = application.owner;
    const ownerLabel = owner?.name
      ? `Team "${owner.name}" (id ${owner.id})`
      : owner
        ? `usuário ${owner.tag ?? owner.username} (id ${owner.id})`
        : "desconhecido";

    console.log(`[Bot] Usuário do bot : ${readyClient.user.tag} (id ${readyClient.user.id})`);
    console.log(`[Bot] Aplicação      : "${application.name}" (id ${application.id})`);
    console.log(`[Bot] Dono           : ${ownerLabel}`);
    console.log(`[Bot] Servidores     : ${readyClient.guilds.cache.size}`);
  } catch (error) {
    console.error("[Bot] ✗ Não foi possível identificar a aplicação:", error.message);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot conectado como ${readyClient.user.tag}`);
  await logIdentity(readyClient);

  try {
    const guild = readyClient.guilds.cache.first();
    if (!guild) {
      console.error("Não foi possível encontrar nenhum servidor");
      return;
    }

    await sendTechLayoutMessage(readyClient);
    watchTechRoles(readyClient);
    await sendColorEmbed(readyClient);
    watchColorRoles(readyClient);
    await sendSupportEmbed(readyClient);
    await sendEmbassadorPanel(readyClient);
    await sendGithubPanel(readyClient);
    startCronGithub(readyClient);
    startApi();
    await startRandomMessages(readyClient);
    trackActivity(readyClient);
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
