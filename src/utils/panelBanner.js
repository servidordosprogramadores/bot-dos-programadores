const { AttachmentBuilder } = require("discord.js");
const fs = require("fs/promises");
const path = require("path");

/**
 * O Discord resolve URL externa de imagem no instante em que a mensagem é criada
 * e não tenta de novo depois: se o host estiver lento nesse momento, a mensagem
 * nasce com a imagem quebrada para sempre. Subir o arquivo junto da mensagem e
 * referenciá-lo por attachment:// tira o proxy do caminho — quem serve passa a
 * ser o CDN do Discord.
 *
 * A imagem é procurada primeiro em assets/, que vai junto na imagem Docker e não
 * depende de rede. A URL é só o plano B, para o caso de o arquivo não ter sido
 * commitado ainda.
 */
const ASSETS_DIR = path.resolve(__dirname, "../../assets");
const FETCH_TIMEOUT_MS = 15000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_END = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

const cache = new Map();

/**
 * O postimg já devolveu PNG truncado (header válido, sem o chunk IEND). Mandar
 * isso para o Discord produz exatamente o banner quebrado que se quer evitar.
 */
function isCompletePng(buffer) {
  if (buffer.length < PNG_SIGNATURE.length + PNG_END.length) return false;
  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return true; // não é PNG, não dá para validar
  return buffer.subarray(-PNG_END.length).equals(PNG_END);
}

async function loadFromDisk(name) {
  try {
    const buffer = await fs.readFile(path.join(ASSETS_DIR, name));
    if (!isCompletePng(buffer)) {
      console.warn(`[Banner] ⚠ assets/${name} está incompleto. Ignorando o arquivo local.`);
      return null;
    }
    return buffer;
  } catch {
    return null;
  }
}

async function loadFromUrl(url, name) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      console.warn(`[Banner] ⚠ ${name}: ${url} respondeu ${response.status}.`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (!isCompletePng(buffer)) {
      console.warn(`[Banner] ⚠ ${name}: download veio truncado (${buffer.length} bytes). Descartado.`);
      return null;
    }

    return buffer;
  } catch (error) {
    console.warn(`[Banner] ⚠ ${name}: falha ao baixar de ${url} — ${error.message}`);
    return null;
  }
}

/**
 * Devolve null quando não consegue a imagem por nenhum caminho. Quem chama deve
 * enviar o painel sem o banner: um painel sem imagem é muito melhor do que um
 * canal vazio, que é no que dá deixar o erro subir.
 */
async function getPanelBanner(url, name) {
  if (cache.has(name)) {
    const cached = cache.get(name);
    return cached ? new AttachmentBuilder(cached, { name }) : null;
  }

  let buffer = await loadFromDisk(name);

  if (buffer) {
    console.log(`[Banner] ✓ ${name} carregado de assets/ (${buffer.length} bytes).`);
  } else {
    buffer = await loadFromUrl(url, name);
    if (buffer) {
      console.log(`[Banner] ✓ ${name} baixado (${buffer.length} bytes). Commite-o em assets/ para não depender da rede.`);
    } else {
      console.error(`[Banner] ✗ ${name} indisponível. O painel será enviado sem banner.`);
    }
  }

  cache.set(name, buffer ?? null);

  return buffer ? new AttachmentBuilder(buffer, { name }) : null;
}

function bannerReference(name) {
  return `attachment://${name}`;
}

module.exports = { getPanelBanner, bannerReference };
