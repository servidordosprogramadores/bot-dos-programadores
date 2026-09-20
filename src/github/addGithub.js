const {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const { connectDB, GithubModel } = require("./model");
const { createAuthUrl, isConfigured } = require("./oauth");
require("dotenv").config();

function replyContainer(text) {
  return new ContainerBuilder()
    .setAccentColor(parseInt(process.env.MAIN_COLOR))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

async function handleAddGithubButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== "add_github_button") return;

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (err) {
    console.error(`[GitHub] ✗ Falha no deferReply. Código: ${err.code}. Mensagem: ${err.message}`);
    if (err.code === 10062) console.log("[GitHub] Interação expirada (10062), ignorando.");
    return;
  }

  const userId = interaction.user.id;
  console.log(`[GitHub] Botão clicado por ${interaction.user.tag} (${userId})`);

  try {
    await connectDB();

    console.log(`[GitHub] Verificando se ${userId} já está no banco...`);
    const existing = await GithubModel.findOne({ discordId: userId });
    if (existing) {
      console.log(`[GitHub] Usuário ${userId} já tem GitHub registrado: @${existing.githubUsername}`);
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer(`Seu GitHub **@${existing.githubUsername}** já foi registrado. Caso queira trocar de conta, remova o GitHub atual do seu perfil do Discord e conecte o novo.`)],
      });
      return;
    }

    if (!isConfigured()) {
      console.error("[GitHub] ✗ OAuth não configurado. Não é possível vincular.");
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer("A vinculação está indisponível no momento. Avise a moderação.")],
      });
      return;
    }

    // Quem autoriza é o próprio usuário: o bot nunca lê a conta de ninguém.
    const authUrl = createAuthUrl(interaction.user);
    console.log(`[GitHub] Link de autorização gerado para ${userId}.`);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        replyContainer(
          "Clique no botão abaixo para autorizar pelo Discord. Vamos ler **apenas** a sua lista de conexões, para descobrir o seu GitHub.\n-# O link vale por 10 minutos e só funciona para você."
        ),
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Autorizar e vincular GitHub")
            .setURL(authUrl)
        ),
      ],
    });

  } catch (error) {
    console.error(`[GitHub] ✗ Erro inesperado para ${interaction.user.tag}:`, error);
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [replyContainer("Ocorreu um erro ao processar sua verificação. Tente novamente mais tarde.")],
    }).catch((e) => console.error("[GitHub] ✗ Falha também no editReply de erro:", e));
  }
}

async function handleRemoveGithubButton(interaction) {
  if (!interaction.isButton() || interaction.customId !== "remove_github_button") return;

  try {
    await interaction.deferReply({ ephemeral: true });
  } catch (err) {
    console.error(`[GitHub] ✗ Falha no deferReply (remover). Código: ${err.code}. Mensagem: ${err.message}`);
    if (err.code === 10062) console.log("[GitHub] Interação expirada (10062), ignorando.");
    return;
  }

  const userId = interaction.user.id;
  console.log(`[GitHub] Remoção solicitada por ${interaction.user.tag} (${userId})`);

  try {
    await connectDB();

    const existing = await GithubModel.findOneAndDelete({ discordId: userId });

    if (!existing) {
      console.log(`[GitHub] Usuário ${userId} não tem GitHub cadastrado para remover.`);
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer("Você não tem um GitHub cadastrado para remover.")],
      });
      return;
    }

    console.log(`[GitHub] ✓ GitHub @${existing.githubUsername} removido para ${userId}.`);
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [replyContainer(`Seu GitHub **@${existing.githubUsername}** foi removido.`)],
    });

  } catch (error) {
    console.error(`[GitHub] ✗ Erro inesperado ao remover para ${interaction.user.tag}:`, error);
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [replyContainer("Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.")],
    }).catch((e) => console.error("[GitHub] ✗ Falha também no editReply de erro:", e));
  }
}

module.exports = { handleAddGithubButton, handleRemoveGithubButton };
