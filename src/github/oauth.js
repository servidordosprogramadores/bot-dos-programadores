const crypto = require("crypto");
const { connectDB, GithubModel } = require("./model");
require("dotenv").config();

/**
 * Ler as conexões de outro usuário exigia token de conta de usuário, o que
 * viola os Termos do Discord. O caminho suportado é o próprio usuário autorizar
 * a aplicação com o escopo "connections": aí GET /users/@me/connections devolve
 * as conexões dele, com o token dele.
 */
const OAUTH_SCOPE = "identify connections";
const STATE_TTL_MS = 10 * 60 * 1000;

// state -> { discordId, discordUsername, discordAvatar, expiresAt }
const pendingStates = new Map();

function config() {
  return {
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    redirectUri: process.env.OAUTH_REDIRECT_URI,
  };
}

function isConfigured() {
  const { clientId, clientSecret, redirectUri } = config();
  return Boolean(clientId && clientSecret && redirectUri);
}

function prunePendingStates() {
  const now = Date.now();
  for (const [state, data] of pendingStates) {
    if (data.expiresAt <= now) pendingStates.delete(state);
  }
}

/**
 * O state amarra o retorno do Discord ao clique que o originou. Sem isso,
 * qualquer um poderia chamar o callback e cadastrar um GitHub no lugar de
 * outra pessoa.
 */
function createAuthUrl(user) {
  prunePendingStates();

  const { clientId, redirectUri } = config();
  const state = crypto.randomBytes(32).toString("hex");

  pendingStates.set(state, {
    discordId: user.id,
    discordUsername: user.username,
    discordAvatar: user.displayAvatarURL({ extension: "png", size: 256 }),
    expiresAt: Date.now() + STATE_TTL_MS,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPE,
    state,
    prompt: "consent",
  });

  return `https://discord.com/oauth2/authorize?${params}`;
}

async function exchangeCode(code) {
  const { clientId, clientSecret, redirectUri } = config();

  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Troca do code falhou: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function fetchConnections(accessToken) {
  const response = await fetch("https://discord.com/api/v10/users/@me/connections", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Busca de conexões falhou: ${response.status}`);
  }

  return response.json();
}

/**
 * O token de acesso só serve para ler as conexões uma vez. Revogá-lo em seguida
 * evita guardar acesso à conta de alguém por mais tempo do que o necessário.
 */
async function revokeToken(accessToken) {
  const { clientId, clientSecret } = config();

  try {
    await fetch("https://discord.com/api/v10/oauth2/token/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        token: accessToken,
      }),
    });
  } catch (error) {
    console.warn("[OAuth] ⚠ Falha ao revogar o token (segue o fluxo):", error.message);
  }
}

async function getGithubInfo(username) {
  const response = await fetch(`https://api.github.com/users/${username}`, {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    console.error(`[OAuth] Erro ao buscar @${username} no GitHub: ${response.status}`);
    return null;
  }

  return response.json();
}

function page(title, message) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1a1b1e;color:#e8e8ea;
       font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;padding:24px}
  .card{max-width:440px;text-align:center;background:#232428;padding:40px 32px;border-radius:16px}
  h1{margin:0 0 12px;font-size:20px}
  p{margin:0;color:#b5bac1}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`;
}

function registerOAuthRoutes(app) {
  if (!isConfigured()) {
    console.warn(
      "[OAuth] ⚠ DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET e/ou OAUTH_REDIRECT_URI não configurados. O botão de adicionar GitHub vai avisar que está indisponível."
    );
  }

  app.get("/auth/github/callback", async (req, res) => {
    const { code, state } = req.query;

    prunePendingStates();
    const pending = state ? pendingStates.get(state) : null;

    if (!code || !pending) {
      console.warn("[OAuth] ⚠ Callback com state inválido ou expirado.");
      return res
        .status(400)
        .send(page("Link expirado", "Volte ao Discord e clique em <b>Adicionar GitHub</b> de novo."));
    }

    pendingStates.delete(state);

    try {
      const token = await exchangeCode(code);
      const connections = await fetchConnections(token.access_token);
      await revokeToken(token.access_token);

      const github = connections.find((connection) => connection.type === "github");

      if (!github) {
        console.log(`[OAuth] ${pending.discordId} autorizou, mas não tem GitHub conectado.`);
        return res.send(
          page(
            "Nenhum GitHub encontrado",
            "Você não tem uma conta do GitHub conectada ao seu Discord. Conecte em <b>Configurações → Conexões</b> e tente de novo."
          )
        );
      }

      const githubInfo = await getGithubInfo(github.name);

      if (!githubInfo) {
        return res
          .status(502)
          .send(page("Erro ao consultar o GitHub", "Tente novamente daqui a alguns minutos."));
      }

      await connectDB();

      await GithubModel.findOneAndUpdate(
        { discordId: pending.discordId },
        {
          discordId: pending.discordId,
          discordUsername: pending.discordUsername,
          discordAvatar: pending.discordAvatar,
          githubId: githubInfo.id,
          githubUsername: githubInfo.login,
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
        },
        { upsert: true, new: true }
      );

      console.log(`[OAuth] ✓ @${githubInfo.login} registrado para ${pending.discordId}.`);

      res.send(
        page(
          "Tudo certo!",
          `O GitHub <b>@${githubInfo.login}</b> foi vinculado. Já pode fechar esta aba e voltar ao Discord.`
        )
      );
    } catch (error) {
      console.error("[OAuth] ✗ Falha no callback:", error);
      res.status(500).send(page("Algo deu errado", "Tente novamente daqui a alguns minutos."));
    }
  });

  console.log("[OAuth] ✓ Rota registrada: GET /auth/github/callback");
}

module.exports = { createAuthUrl, registerOAuthRoutes, isConfigured };
