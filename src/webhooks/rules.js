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
          "content": "# Regras do servidor\nPara manter o ambiente seguro e acolhedor, siga as regras abaixo com respeito e bom senso:"
        },
        {
          "type": 10,
          "content": "### 1. Seja respeitoso com todos no servidor\nQueremos que este servidor seja um lugar amigável para todos. Respeite as opiniões, crenças e limites dos outros."
        },
        {
          "type": 10,
          "content": "### 2. Nada de discurso de ódio, racismo ou discriminação\nQualquer forma de discurso de ódio, comentários racistas, sexistas ou ataques com base em religião ou identidade  não serão tolerados."
        },
        {
          "type": 10,
          "content": "### 3. Sem spam, flood ou propaganda\nEvite enviar mensagens repetidas, menções desnecessárias, links ou propagandas. Mantenha o chat limpo e agradável."
        },
        {
          "type": 10,
          "content": "### 4. Mantenha o conteúdo apropriado\nConteúdo NSFW (impróprio para o trabalho), gore ou ofensivo não é permitido. Isso inclui imagens e mensagens."
        },
        {
          "type": 10,
          "content": "### 5. Siga as orientações da equipe\nModeradores e administradores estão aqui para manter o servidor seguro e divertido. Siga as instruções deles sempre."
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