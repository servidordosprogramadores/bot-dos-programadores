const { Events } = require("discord.js");

const DEFAULT_DEBOUNCE_MS = 5000;

/**
 * Re-renderiza um painel quando cargos ou emojis mudam. Mexer em vários cargos
 * seguidos dispara vários eventos, então o debounce evita reeditar a mensagem
 * uma vez por alteração.
 */
function watchRoleChanges(client, label, render, debounceMs = DEFAULT_DEBOUNCE_MS) {
  let timer = null;

  const scheduleRefresh = (reason) => {
    console.log(`[${label}] Mudança detectada (${reason}). Painel será atualizado em ${debounceMs / 1000}s.`);
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await render(client);
      } catch (error) {
        console.error(`[${label}] ✗ Erro ao atualizar painel:`, error);
      }
    }, debounceMs);
  };

  client.on(Events.GuildRoleCreate, (role) => scheduleRefresh(`cargo "${role.name}" criado`));
  client.on(Events.GuildRoleDelete, (role) => scheduleRefresh(`cargo "${role.name}" apagado`));
  client.on(Events.GuildRoleUpdate, (_oldRole, newRole) => scheduleRefresh(`cargo "${newRole.name}" alterado`));
  client.on(Events.GuildEmojiCreate, (emoji) => scheduleRefresh(`emoji "${emoji.name}" criado`));
  client.on(Events.GuildEmojiDelete, (emoji) => scheduleRefresh(`emoji "${emoji.name}" apagado`));
  client.on(Events.GuildEmojiUpdate, (_oldEmoji, newEmoji) => scheduleRefresh(`emoji "${newEmoji.name}" alterado`));

  console.log(`[${label}] ✓ Observando mudanças de cargos e emojis.`);
}

module.exports = { watchRoleChanges };
