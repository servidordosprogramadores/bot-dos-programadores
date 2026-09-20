const { getRanks } = require('./activity');
const { sendRankMessage } = require('./sendRank');

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

module.exports = (client) => {
  console.log("[Ranking] Iniciando módulo de ranking...");

  const runRankingLoop = async () => {
    console.log("[Ranking] ▶ Executando ciclo de atualização...");
    try {
      const { textRank, voiceRank } = await getRanks();
      await sendRankMessage(client, textRank, voiceRank);
      console.log("[Ranking] ✓ Ciclo concluído.");
    } catch (error) {
      console.error("[Ranking] ✗ Erro no loop:", error);
    }
  };

  runRankingLoop();

  console.log("[Ranking] ✓ Loop agendado para executar a cada 1 hora.");
  setInterval(runRankingLoop, REFRESH_INTERVAL_MS);
};
