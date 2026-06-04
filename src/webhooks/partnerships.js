const fetch = require("node-fetch");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const WEBHOOK_URL = process.env.PARTNERSHIPS_WEBHOOK + "?with_components=true";

const payload = {
  components: [
    {
      "type": 17,
      "accent_color": 1722367,
      "spoiler": false,
      "components": [
        {
          "type": 12,
          "items": [
            {
              "media": {
                "url": "https://i.postimg.cc/xTCdqWZX/PRg5.png"
              },
              "description": null,
              "spoiler": false
            }
          ]
        },
        {
          "type": 10,
          "content": "# Sistema de Parcerias"
        },
        {
          "type": 10,
          "content": "O **Servidor dos Programadores** está aberto a parcerias com comunidades, empresas, eventos, projetos, produtos e iniciativas que façam sentido para o nosso público."
        },
        {
          "type": 10,
          "content": "Realizamos **parcerias pagas** e **não pagas**, mas todas passam por uma análise para entender se fazem sentido para o nosso público e se agregam valor à comunidade."
        },
        {
          "type": 10,
          "content": "Caso tenha interesse, **abra um ticket de parceria em <#1454915939475914802>** e envie os detalhes da sua proposta para nossa equipe avaliar."
        },
        {
          "type": 10,
          "content": "-# Nosso objetivo é criar parcerias que realmente agreguem valor para os membros do servidor, evitando divulgações aleatórias ou que não tenham relação com o nosso propósito."
        }
      ]
    }
  ],
  flags: 32768,
};

async function sendWebhook() {
  console.log("[Partnerships] Enviando painel de parceirias...");
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log("[Partnerships] ✓ Mensagem enviada com sucesso.");
    } else {
      console.error("[Partnerships] ✗ Falha ao enviar:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[Partnerships] ✗ Erro ao enviar webhook:", err);
  }
}

sendWebhook();