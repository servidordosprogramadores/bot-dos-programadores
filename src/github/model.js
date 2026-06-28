const mongoose = require("mongoose");
require("dotenv").config();

const githubSchema = new mongoose.Schema({
  discordId: { type: String, required: true, unique: true },
  githubUsername: { type: String, required: true },
  profileUrl: String,
  name: String,
  bio: String,
  followers: Number,
  following: Number,
  company: String,
  blog: String,
  publicRepos: Number,
  githubCreatedAt: Date,
  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

let dbConnected = false;

async function connectDB() {
  if (dbConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  dbConnected = true;
  console.log("[GitHub] ✓ Conectado ao MongoDB.");
}

const GithubModel = mongoose.models.sdp_github || mongoose.model("sdp_github", githubSchema, "sdp_github");

module.exports = { connectDB, GithubModel };
