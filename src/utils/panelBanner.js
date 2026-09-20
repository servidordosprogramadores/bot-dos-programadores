const { AttachmentBuilder } = require("discord.js");

/**
 * O Discord resolve URL externa de imagem no instante em que a mensagem é criada
 * e não tenta de novo depois: se o host estiver lento nesse momento, a mensagem
 * nasce com a imagem quebrada para sempre. Subir o arquivo junto da mensagem e
 * referenciá-lo por attachment:// tira o proxy do caminho — quem serve passa a
 * ser o CDN do Discord.
 *
 * O buffer fica em cache por URL porque os painéis são reeditados, e sem isso
 * cada re-render baixaria a imagem de novo.
 */
const cache = new Map();

async function getPanelBanner(url, name) {
  let buffer = cache.get(url);

  if (!buffer) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar o banner ${url}: ${response.status}`);
    buffer = Buffer.from(await response.arrayBuffer());
    cache.set(url, buffer);
    console.log(`[Banner] ✓ ${name} em cache (${buffer.length} bytes).`);
  }

  return new AttachmentBuilder(buffer, { name });
}

function bannerReference(name) {
  return `attachment://${name}`;
}

module.exports = { getPanelBanner, bannerReference };
