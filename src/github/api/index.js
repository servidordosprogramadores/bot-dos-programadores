const express = require("express");
const cors = require("cors");
const { connectDB, GithubModel } = require("../model");
require("dotenv").config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;
const CACHE_TTL_MS = 5 * 60 * 1000;

let cache = null;
let cacheAt = null;

app.get("/github", async (req, res) => {
  try {
    const now = Date.now();

    if (cache && cacheAt && now - cacheAt < CACHE_TTL_MS) {
      console.log("[API] Cache hit. Retornando dados em cache.");
      return res.json(cache);
    }

    await connectDB();

    const profiles = await GithubModel.find().lean();

    cache = profiles;
    cacheAt = now;

    console.log(`[API] Cache atualizado. ${profiles.length} perfil(s) retornado(s).`);
    res.json(profiles);
  } catch (error) {
    console.error("[API] ✗ Erro ao buscar perfis:", error);
    res.status(500).json({ error: "Erro interno ao buscar perfis." });
  }
});

function startApi() {
  app.listen(PORT, () => {
    console.log(`[API] ✓ Rodando na porta ${PORT}. Rota: GET /github`);
  });
}

module.exports = { startApi };
