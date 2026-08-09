const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const WEBHOOK_URL = process.env.WEBHOOK_RULES + "?with_components=true";

const payload = {
  components: [
    {
      "type": 17,
      "accent_color": parseInt(process.env.MAIN_COLOR),
      "spoiler": false,
      "components": [
        {
          "type": 12,
          "items": [
            {
              "media": {
                "url": "https://i.postimg.cc/6QkfnB1m/PROGRAMADORES3.png"
              },
              "description": null,
              "spoiler": false
            }
          ]
        },
        {
          "type": 10,
          "content": "# Regras do Servidor\nPara manter um ambiente seguro, organizado e acolhedor para todos os membros, siga as regras abaixo:"
        },
        {
          "type": 10,
          "content": "### 1. Respeito e Convivência\nTrate todos os membros com respeito. Ataques pessoais, provocações, humilhações, assédio, perseguição, intimidação ou qualquer comportamento hostil não serão tolerados. Discussões e debates saudáveis são permitidos, mas brigas e conflitos pessoais não."
        },
        {
          "type": 10,
          "content": "### 2. Discriminação e Discurso de Ódio\nÉ proibido qualquer tipo de racismo, xenofobia, homofobia, machismo, capacitismo, discriminação religiosa ou qualquer outra forma de preconceito ou discurso de ódio, mesmo quando apresentado como brincadeira."
        },
        {
          "type": 10,
          "content": "### 3. Conteúdo Inapropriado\nNão é permitido compartilhar gore, conteúdo ilegal, pornográfico - conversas de qualquer conteúdo adulto, sejam imagens de cunho sexual ou linguagem obscena. Esta regra também se aplica a nicknames, perfis, biografias, banners, avatares e qualquer outro conteúdo exibido no servidor."
        },
        {
          "type": 10,
          "content": "### 4. Spam e Flood\nSpam, flood, envio repetitivo de mensagens, mídias, emojis, comandos ou menções excessivas não são permitidos."
        },
        {
          "type": 10,
          "content": "### 5. Divulgação e Autopromoção\nA divulgação de projetos pessoais, portfólios e redes sociais deve ocorrer apenas nos canais apropriados. A divulgação por mensagens privadas utilizando o servidor para captar membros, promover serviços ou fazer propaganda não autorizada é proibida."
        },
        {
          "type": 10,
          "content": "### 6. Privacidade e Segurança\nÉ proibido compartilhar informações pessoais suas ou de terceiros, incluindo telefones, endereços, e-mails ou outros dados privados. Doxxing, vazamento de informações e exposição de conversas privadas sem consentimento não serão tolerados."
        },
        {
          "type": 10,
          "content": "### 7. Temas Sensíveis\nDiscussões sobre política, religião, ideologias, guerras ou outros temas potencialmente polêmicos poderão ser encerradas pela moderação caso estejam gerando conflitos, desconforto ou prejudicando o ambiente da comunidade."
        },
        {
          "type": 10,
          "content": "### 8. Canais de Voz e Compartilhamento de Tela\nNão é permitido utilizar soundboards de forma abusiva, causar ruídos excessivos, utilizar modificadores de voz para “trollagem” ou compartilhar conteúdo que infrinja qualquer regra do servidor."
        },
        {
          "type": 10,
          "content": "### 9. Tentativas de Burlar Regras\nO uso de contas alternativas para evitar punições, auxiliar membros punidos a contornar restrições ou a insistência contínua em comportamentos inadequados também serão considerados infrações."
        },
        {
          "type": 10,
          "content": "### 10. Decisões da Moderação\nA equipe de moderação poderá agir em situações que prejudiquem a comunidade, mesmo que não estejam descritas explicitamente nestas regras. Tentar explorar brechas, contornar regras ou agir de má-fé será tratado como infração.\n\nEm caso de dúvidas, denúncias ou problemas, entre em contato com a equipe através de **#suporte**."
        },
        {
          "type": 10,
          "content": "-# Ao entrar no **Servidor do Programadores**, você concorda com os **[Termos de Serviço](https://discord.com/terms)** e **[Diretrizes da Comunidade](https://discord.com/guidelines) **do **Discord**."
        }
      ]
    }
  ],
  flags: 32768,
};

async function sendWebhook() {
  console.log("[Rules] Enviando painel de regras...");
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log("[Rules] ✓ Mensagem enviada com sucesso.");
    } else {
      console.error("[Rules] ✗ Falha ao enviar:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Rules] ✗ Erro ao enviar webhook:", err);
  }
}

sendWebhook();