const {
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const lists = [
  {
    name: "padrão",
    accentColor: parseInt(process.env.MAIN_COLOR) || 0x2b2d31,
    messages: [
      "Sempre desconfie de vagas que te mandam no privado. Nossos canais de vagas oficiais são <#1455014681881350216>, <#1465190415614345329>, <#1465190447424209212>, <#1465190476280889344> e <#1465190501937315927>.",
      "Escolha sua cor no chat <#1381473062108790814>.",
      "Escolha suas tecnologias no canal <#1363980601115410462>.",
      "Torne-se um embaixador do servidor! Confira o chat <#1410072306021302344>.",
      "Confira o ranking de membros do servidor no chat <#1454923683486367879>.",
      "Precisa de ajuda no servidor? Abra um ticket de suporte no chat <#1454915939475914802>.",
      "Precisa de ajuda com código ou programação? Mande uma mensagem no chat <#1382444218043338813>.",
      "Para verificar o seu rank utilize o comando `/id` no chat <#1224155518604542182>.",
      "Impulsione o servidor! Confira o chat <#1363964628639551498>.",
      "Conheça os cargos do servidor! Confira o chat <#1381473062108790814>.",
    ],
  }
];

let lastListIndex = -1;
const lastMessageIndexes = new Array(lists.length).fill(-1);

async function startRandomMessages(client) {
  const channelId = process.env.CHAT_CHANNEL_ID;

  console.log("[Random] Iniciando serviço de mensagens aleatórias...");
  console.log(`[Random] Listas carregadas: ${lists.length} (padrão + ${lists.length - 1} parceiros).`);
  console.log(`[Random] Total de mensagens: ${lists.reduce((acc, l) => acc + l.messages.length, 0)}.`);

  console.log(`[Random] Buscando canal ${channelId}...`);
  const channel = await client.channels.fetch(channelId);
  console.log(`[Random] ✓ Canal encontrado: #${channel.name}`);

  console.log("[Random] Buscando webhooks do canal...");
  const webhooks = await channel.fetchWebhooks();
  let webhook = webhooks.find((wh) => wh.owner?.id === client.user.id);

  if (!webhook) {
    console.log("[Random] Nenhum webhook encontrado. Criando novo...");
    webhook = await channel.createWebhook({ name: client.user.username });
    console.log(`[Random] ✓ Webhook criado: ${webhook.id}`);
  } else {
    console.log(`[Random] ✓ Webhook encontrado: ${webhook.id}`);
  }

  const runTask = async () => {
    console.log("[Random] ▶ Executando tarefa de mensagem aleatória...");
    try {
      console.log("[Random] Verificando histórico (últimas 80 mensagens)...");
      const history = await channel.messages.fetch({ limit: 80 });
      const hasRecent = history.some((msg) => msg.webhookId === webhook.id);

      if (hasRecent) {
        console.log("[Random] ⏭ Já existe mensagem automática recente. Aguardando próximo ciclo.");
        return;
      }
      console.log("[Random] ✓ Nenhuma mensagem automática recente. Prosseguindo...");

      let randomListIndex;
      do {
        randomListIndex = Math.floor(Math.random() * lists.length);
      } while (randomListIndex === lastListIndex && lists.length > 1);

      lastListIndex = randomListIndex;
      const list = lists[randomListIndex];
      console.log(`[Random] Lista sorteada: "${list.name}" (índice ${randomListIndex}).`);

      let randomMsgIndex;
      do {
        randomMsgIndex = Math.floor(Math.random() * list.messages.length);
      } while (randomMsgIndex === lastMessageIndexes[randomListIndex] && list.messages.length > 1);

      lastMessageIndexes[randomListIndex] = randomMsgIndex;
      const content = list.messages[randomMsgIndex];
      console.log(`[Random] Mensagem sorteada (índice ${randomMsgIndex}): "${content.slice(0, 60)}..."`);

      const container = new ContainerBuilder()
        .setAccentColor(list.accentColor)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

      const actionRow = new ActionRowBuilder();

      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId("auto_msg")
          .setLabel("Mensagem automática")
          .setEmoji("<:settings:1488697857459490826>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      if (list.linkUrl) {
        actionRow.addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel(list.linkLabel)
            .setURL(list.linkUrl)
        );
      }

      const sendOptions = {
        components: [container, actionRow],
        flags: MessageFlags.IsComponentsV2,
      };

      if (list.webhookUsername) sendOptions.username = list.webhookUsername;
      if (list.webhookAvatarURL) sendOptions.avatarURL = list.webhookAvatarURL;

      console.log("[Random] Enviando mensagem...");
      await webhook.send(sendOptions);
      console.log(`[Random] ✓ Mensagem enviada com sucesso! (lista: "${list.name}")`);
    } catch (err) {
      console.error("[Random] ✗ Erro na tarefa:", err);
    }
  };

  // Executar a cada 2 horas
  setInterval(runTask, 2 * 60 * 60 * 1000);
  console.log("[Random] ✓ Intervalo de 2 horas registrado. Executando primeira rodada imediatamente...");

  runTask();
}

module.exports = { startRandomMessages };
