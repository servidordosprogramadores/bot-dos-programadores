const { PermissionFlagsBits } = require("discord.js");

/**
 * Resolve a lista de cargos de um painel a partir da hierarquia do Discord: são
 * os cargos posicionados entre dois cargos separadores. Nada vem de array fixo,
 * então criar, renomear, reordenar ou apagar um cargo já muda o painel.
 *
 * Os cargos vêm de guild.roles.cache, que o intent Guilds mantém atualizado pelo
 * gateway — não custa requisição nenhuma.
 */
function logRoleReference(guild, label) {
  const roles = [...guild.roles.cache.values()]
    .filter((role) => role.id !== guild.id)
    .sort((a, b) => b.position - a.position)
    .slice(0, 40);

  console.log(`[${label}] Cargos do servidor, de cima para baixo, para configurar as variáveis:`);
  for (const role of roles) {
    console.log(`[${label}]   position=${String(role.position).padStart(3)} id=${role.id} "${role.name}"`);
  }
}

function resolveRoleBlock(guild, { label, startId, endId, startVar, endVar, max }) {
  if (!startId || !endId) {
    console.error(`[${label}] ✗ ${startVar} e/ou ${endVar} não configurados.`);
    logRoleReference(guild, label);
    return [];
  }

  const start = guild.roles.cache.get(startId);
  const end = guild.roles.cache.get(endId);

  if (!start || !end) {
    console.error(
      `[${label}] ✗ Cargo separador não encontrado (início: ${start ? "ok" : startId}, fim: ${end ? "ok" : endId}).`
    );
    logRoleReference(guild, label);
    return [];
  }

  if (start.position <= end.position) {
    console.error(
      `[${label}] ✗ Separadores invertidos: "${start.name}" (position ${start.position}) precisa estar acima de "${end.name}" (position ${end.position}).`
    );
    return [];
  }

  const me = guild.members.me;

  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    console.error(`[${label}] ✗ O bot não tem a permissão Gerenciar Cargos. Nada funcionaria.`);
    return [];
  }

  const botTopRole = me.roles.highest;

  const candidates = [...guild.roles.cache.values()]
    .filter((role) => role.position < start.position && role.position > end.position)
    .sort((a, b) => b.position - a.position);

  const roles = [];
  const skipped = [];

  for (const role of candidates) {
    if (role.id === guild.id) continue;

    if (role.managed) {
      skipped.push(`"${role.name}" é gerenciado por uma integração e não pode ser atribuído`);
      continue;
    }

    if (role.comparePositionTo(botTopRole) >= 0) {
      skipped.push(
        `"${role.name}" está acima de "${botTopRole.name}" na hierarquia, o bot não consegue atribuí-lo`
      );
      continue;
    }

    roles.push(role);
  }

  for (const reason of skipped) {
    console.warn(`[${label}] ⚠ Ignorado: ${reason}.`);
  }

  if (max && roles.length > max) {
    console.warn(
      `[${label}] ⚠ ${roles.length} cargos no bloco, mas o limite é ${max}. Os excedentes foram cortados.`
    );
    roles.length = max;
  }

  console.log(
    `[${label}] ✓ ${roles.length} cargo(s) entre "${start.name}" e "${end.name}": ${roles
      .map((role) => role.name)
      .join(", ")}.`
  );

  return roles;
}

module.exports = { resolveRoleBlock, logRoleReference };
