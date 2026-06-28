const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const { connectDB, GithubModel } = require("./model");
require("dotenv").config();

async function getUserProfile(userId) {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/users/${userId}/profile?with_mutual_guilds=false`,
      {
        method: "GET",
        headers: { Authorization: process.env.AUTH_TOKEN },
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`[GitHub] Erro ao buscar perfil: ${response.status} ${response.statusText} — ${body}`);
      return null;
    }

    const data = await response.json();
    console.log(`[GitHub] Resposta do perfil Discord para ${userId}: connected_accounts=${JSON.stringify((data.connected_accounts || []).map((c) => ({ type: c.type, name: c.name })))}`);
    return data;
  } catch (error) {
    console.error("[GitHub] Falha na requisição de perfil:", error);
    return null;
  }
}

async function getGithubInfo(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.error(`[GitHub] Erro ao buscar info do GitHub: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("[GitHub] Falha na requisição da API do GitHub:", error);
    return null;
  }
}

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

    console.log(`[GitHub] Buscando perfil do Discord para ${userId}...`);
    const profile = await getUserProfile(userId);
    if (!profile) {
      console.error(`[GitHub] ✗ Perfil não retornado para ${userId}.`);
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer("Ocorreu um erro ao processar sua verificação. Tente novamente mais tarde.")],
      });
      return;
    }

    const connections = profile.connected_accounts || [];
    console.log(`[GitHub] Conexões encontradas para ${userId}: ${connections.map((c) => c.type).join(", ") || "nenhuma"}`);

    const githubConnection = connections.find((c) => c.type === "github");

    if (!githubConnection) {
      console.log(`[GitHub] Nenhuma conexão com GitHub encontrada para ${userId}.`);
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer("Você não tem um GitHub vinculado ao seu perfil do Discord.")],
      });
      return;
    }

    const githubUsername = githubConnection.name;
    console.log(`[GitHub] GitHub encontrado para ${userId}: @${githubUsername}`);

    console.log(`[GitHub] Buscando informações da API do GitHub para @${githubUsername}...`);
    const githubInfo = await getGithubInfo(githubUsername);
    if (!githubInfo) {
      console.error(`[GitHub] ✗ Falha ao buscar info do GitHub para @${githubUsername}.`);
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [replyContainer("Ocorreu um erro ao processar sua verificação. Tente novamente mais tarde.")],
      });
      return;
    }

    console.log(`[GitHub] Info recebida para @${githubUsername}: ${githubInfo.public_repos} repos, ${githubInfo.followers} seguidores.`);

    await GithubModel.create({
      discordId: userId,
      discordUsername: interaction.user.username,
      discordAvatar: interaction.user.displayAvatarURL({ extension: "png", size: 256 }),
      githubUsername,
      profileUrl: githubInfo.html_url,
      name: githubInfo.name,
      bio: githubInfo.bio,
      followers: githubInfo.followers,
      following: githubInfo.following,
      company: githubInfo.company,
      blog: githubInfo.blog,
      publicRepos: githubInfo.public_repos,
      githubCreatedAt: new Date(githubInfo.created_at),
      updatedAt: new Date(),
    });

    console.log(`[GitHub] ✓ GitHub @${githubUsername} registrado para ${userId}.`);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [replyContainer(`Seu GitHub **@${githubUsername}** foi registrado e deve aparecer no site em instantes.`)],
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
