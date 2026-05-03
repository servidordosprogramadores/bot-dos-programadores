const {
  TextDisplayBuilder,
  MessageFlags,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} = require("discord.js");

const SUPPORT_CHANNEL_ID = process.env.SUPPORT_CHANNEL_ID;

async function sendSupportEmbed(client) {
  try {
    console.log(`[Support] Buscando canal ${SUPPORT_CHANNEL_ID}...`);
    const channel = await client.channels.fetch(SUPPORT_CHANNEL_ID);
    if (!channel) {
      console.error("[Support] Canal de suporte não encontrado.");
      return;
    }
    console.log(`[Support] ✓ Canal encontrado: #${channel.name}`);

    console.log("[Support] Buscando/criando webhook do canal...");
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.owner?.id === client.user.id);
    if (!webhook) {
      webhook = await channel.createWebhook({ name: client.user.username });
      console.log(`[Support] ✓ Webhook criado: ${webhook.id}`);
    } else {
      console.log(`[Support] ✓ Webhook encontrado: ${webhook.id}`);
    }

    console.log("[Support] Limpando mensagens anteriores...");
    const messages = await channel.messages.fetch({ limit: 10 });
    if (messages.size > 0) {
      await channel.bulkDelete(messages);
      console.log(`[Support] ✓ ${messages.size} mensagem(ns) deletada(s).`);
    } else {
      console.log("[Support] Nenhuma mensagem para limpar.");
    }

    const components = [
      new ContainerBuilder()
        .setAccentColor(parseInt(process.env.MAIN_COLOR))
        .addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(
              "https://i.postimg.cc/TwSXwh0m/PRg1.png"
            )
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent("# Painel de Suporte")
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "Se você precisa de ajuda, suporte ou tem alguma dúvida, estamos aqui para te ajudar. Selecione uma opção no menu abaixo, e abra um ticket."
          )
        )
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "-# Membros que abrirem tickets sem motivo serão penalizados."
          )
        ),
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("support_ticket_select")
          .setPlaceholder("Escolha uma opção")
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel("Problema Técnico")
              .setValue("ticket_tech_issue")
              .setDescription(
                "Algo não está funcionando (bot, cargos, canais, permissões)."
              )
              .setEmoji("1455329097788952812"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Denúncia")
              .setValue("ticket_report")
              .setDescription(
                "Denúncias de comportamento suspeito, golpes ou usuários mal-intencionados."
              )
              .setEmoji("1455329165539541209"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Vagas & Oportunidades")
              .setValue("ticket_jobs")
              .setDescription(
                "Dúvidas sobre vagas postadas no servidor ou processos seletivos."
              )
              .setEmoji("1455329237144834221"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Parcerias / Contato")
              .setValue("ticket_partnership")
              .setDescription(
                "Bate-papo sobre parcerias, divulgação ou assuntos externos."
              )
              .setEmoji("1455329059268722719"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Hackathons / Eventos")
              .setValue("ticket_hackathon")
              .setDescription(
                "Dúvidas sobre hackathons e eventos do servidor."
              )
              .setEmoji("1500615697531932712"),
            new StringSelectMenuOptionBuilder()
              .setLabel("Outros")
              .setValue("ticket_other")
              .setDescription(
                "Outras solicitações de suporte."
              )
              .setEmoji("1455354878430937221")
          )
      ),
    ];

    await webhook.send({
      username: "Suporte do servidor",
      avatarURL: "https://i.postimg.cc/4xygFMRb/phone-fill.png",
      flags: MessageFlags.IsComponentsV2,
      components: components,
    });

    console.log("[Support] Painel enviado com sucesso!");
  } catch (error) {
    console.error("[Support] Erro ao enviar painel:", error);
  }
}

module.exports = { sendSupportEmbed };
