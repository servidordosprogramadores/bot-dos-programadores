const { connectDB, GithubModel } = require("./model");
require("dotenv").config();

const GUILD_ID = process.env.GUILD_ID;
const BATCH_SIZE = 200;
const INTERVAL_MS = 10 * 60 * 1000;

async function getGithubInfo(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.error(`[CronGitHub] Erro ao buscar @${username}: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`[CronGitHub] Falha na requisição para @${username}:`, error);
    return null;
  }
}

async function runUpdate(client) {
  console.log("[CronGitHub] ▶ Iniciando atualização de perfis...");

  try {
    await connectDB();

    const guild = await client.guilds.fetch(GUILD_ID);

    const profiles = await GithubModel.find().sort({ updatedAt: 1 }).limit(BATCH_SIZE);
    console.log(`[CronGitHub] ${profiles.length} perfil(s) selecionado(s) para atualização.`);

    let updated = 0;
    let removed = 0;
    let failed = 0;

    for (const profile of profiles) {
      let member;
      try {
        member = await guild.members.fetch(profile.discordId);
      } catch {
        member = null;
      }

      if (!member) {
        await GithubModel.deleteOne({ discordId: profile.discordId });
        console.log(`[CronGitHub] ✗ Membro ${profile.discordId} (@${profile.githubUsername}) saiu do servidor. Removido do banco.`);
        removed++;
        continue;
      }

      const githubInfo = await getGithubInfo(profile.githubUsername);
      if (!githubInfo) {
        failed++;
        continue;
      }

      await GithubModel.updateOne(
        { discordId: profile.discordId },
        {
          discordUsername: member.user.username,
          discordAvatar: member.user.displayAvatarURL({ extension: "png", size: 256 }),
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
        }
      );

      updated++;
    }

    console.log(`[CronGitHub] ✓ Concluído. Atualizados: ${updated} | Removidos: ${removed} | Falhas: ${failed}`);
  } catch (error) {
    console.error("[CronGitHub] ✗ Erro durante atualização:", error);
  }
}

function startCronGithub(client) {
  console.log("[CronGitHub] ✓ Cron iniciado. Rodando a cada 10 minutos.");
  setInterval(() => runUpdate(client), INTERVAL_MS);
  runUpdate(client);
}

module.exports = { startCronGithub };
