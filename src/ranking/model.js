const mongoose = require("mongoose");
require("dotenv").config();

/**
 * Atividade contada pelo próprio bot. Antes o ranking vinha de outro bot, o que
 * exigia disparar um slash command com token de conta de usuário — automação de
 * conta, proibida pelos Termos do Discord.
 */
const activitySchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  messageCount: { type: Number, default: 0 },
  voiceSeconds: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

activitySchema.index({ messageCount: -1 });
activitySchema.index({ voiceSeconds: -1 });

const ActivityModel =
  mongoose.models.sdp_activity ||
  mongoose.model("sdp_activity", activitySchema, "sdp_activity");

module.exports = { ActivityModel };
