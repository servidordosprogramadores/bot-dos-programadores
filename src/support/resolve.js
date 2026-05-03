const {
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const CATEGORY_MAP = {
  "ticket_tech_issue": "Problema Técnico",
  "ticket_report": "Denúncia",
  "ticket_jobs": "Vagas & Oportunidades",
  "ticket_partnership": "Parcerias / Contato",
  "ticket_hackathon": "Hackathons / Eventos",
};

async function handleSupportInteraction(interaction) {
  try {
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "support_ticket_select"
    ) {
      await createTicket(interaction);
    } else if (
      interaction.isButton() &&
      interaction.customId === "close_ticket_button"
    ) {
      await closeTicket(interaction);
    }
  } catch (error) {
    console.error("[Support] Erro ao processar interação de suporte:", error);
    try {
      const container = new ContainerBuilder()
        .setAccentColor(parseInt(process.env.MAIN_COLOR))
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "Ocorreu um erro ao processar sua solicitação."
          )
        );

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
        });
      } else {
        await interaction.followUp({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [container],
        });
      }
    } catch (e) {
      // Ignorar erro se não for possível responder
    }
  }
}

async function createTicket(interaction) {
  console.log(`[Support] Criando ticket para ${interaction.user.tag} (tipo: ${interaction.values?.[0]})...`);
  const { guild, user, values } = interaction;

  // Ler variáveis de ambiente dentro da função para garantir que foram carregadas
  const TICKETS_CATEGORY_ID = process.env.TICKETS_CATEGORY_ID;
  const CEO_ROLE_ID = process.env.CEO_ROLE_ID;
  const ADMINISTRADOR_ROLE_ID = process.env.ADMINISTRADOR_ROLE_ID;
  const SUPORTE_ROLE_ID = process.env.SUPORTE_ROLE_ID;

  // Verificar se o usuário já possui um ticket aberto na categoria
  const existingChannel = guild.channels.cache.find(
    (channel) =>
      channel.parentId === TICKETS_CATEGORY_ID &&
      channel.permissionOverwrites.cache.has(user.id)
  );

  if (existingChannel) {
    console.log(`[Support] Usuário ${user.tag} já possui ticket aberto: #${existingChannel.name}`);
    const container = new ContainerBuilder()
      .setAccentColor(parseInt(process.env.MAIN_COLOR))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `Você já possui um ticket aberto em ${existingChannel}.`
        )
      );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container],
    });
    return;
  }

  const categoryName = CATEGORY_MAP[values[0]] || "Problema técnico";

  // Construir permissões dinamicamente para evitar IDs undefined
  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
      ],
    },
  ];

  const isPartnership = values[0] === "ticket_partnership";
  const rolesToAdd = isPartnership
    ? [CEO_ROLE_ID]
    : [CEO_ROLE_ID, ADMINISTRADOR_ROLE_ID, SUPORTE_ROLE_ID];
  rolesToAdd.forEach((roleId) => {
    if (roleId) {
      permissionOverwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
        ],
      });
    }
  });

  console.log(`[Support] Criando canal de ticket para ${user.tag}...`);
  const channel = await guild.channels.create({
    name: `ticket-${user.username}`,
    type: ChannelType.GuildText,
    parent: TICKETS_CATEGORY_ID,
    permissionOverwrites: permissionOverwrites,
  });
  console.log(`[Support] ✓ Canal criado: #${channel.name} (${channel.id})`);

  const components = [
    new ContainerBuilder()
      .setAccentColor(parseInt(process.env.MAIN_COLOR))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### Ticket de <@${user.id}>`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`**Categoria**: ${categoryName}`)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "Descreva com o máximo de detalhes o que aconteceu ou o motivo de você ter aberto este ticket. Quanto mais informações você enviar, mais rápido conseguimos te ajudar."
        )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "Nossa equipe já foi notificada e irá te atender em breve."
        )
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# ${rolesToAdd.filter(Boolean).map(id => `<@&${id}>`).join(" ")}`
        )
      ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel("Fechar ticket")
        .setCustomId("close_ticket_button")
    ),
  ];

  await channel.send({
    flags: MessageFlags.IsComponentsV2,
    components: components,
  });

  const successContainer = new ContainerBuilder()
    .setAccentColor(parseInt(process.env.MAIN_COLOR))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Seu ticket foi criado em ${channel}.`)
    );

  console.log(`[Support] ✓ Ticket criado com sucesso para ${user.tag}.`);
  await interaction.reply({
    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    components: [successContainer],
  });
}

async function closeTicket(interaction) {
  console.log(`[Support] Fechando ticket ${interaction.channel.name} (solicitado por ${interaction.user.tag})...`);
  const { member, channel } = interaction;
  const CEO_ROLE_ID = process.env.CEO_ROLE_ID;
  const ADMINISTRADOR_ROLE_ID = process.env.ADMINISTRADOR_ROLE_ID;
  const SUPORTE_ROLE_ID = process.env.SUPORTE_ROLE_ID;

  const allowedRoles = [CEO_ROLE_ID, ADMINISTRADOR_ROLE_ID, SUPORTE_ROLE_ID].filter(Boolean);

  const hasPermission = member.roles.cache.some((role) =>
    allowedRoles.includes(role.id)
  );

  if (!hasPermission) {
    console.log(`[Support] ✗ ${interaction.user.tag} não tem permissão para fechar o ticket.`);
    const container = new ContainerBuilder()
      .setAccentColor(parseInt(process.env.MAIN_COLOR))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "Você não tem permissão para fechar este ticket."
        )
      );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container],
    });
    return;
  }

  console.log(`[Support] ✓ Deletando canal #${channel.name}...`);
  await channel.delete();
  console.log(`[Support] ✓ Ticket fechado com sucesso.`);
}

module.exports = { handleSupportInteraction };
