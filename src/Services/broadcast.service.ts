import { isTextBasedChannel } from '@sapphire/discord.js-utilities';
import { container } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import {
	ActionRowBuilder,
	ApplicationCommandOptionAllowedChannelTypes,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	ContainerBuilder,
	ContextMenuCommandInteraction,
	escapeMarkdown,
	MessageActionRowComponentBuilder,
	MessageFlags,
	ModalBuilder,
	ModalSubmitInteraction,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';
import { sendLongMessageAsync } from '../utils/methods/channelMethods';
import { 
	buildCopyableRawMessage,
	buildEditableRawMessage,
	interactionRespond, 
	protectBackticks, 
	verifyMessage, 
	parseRawMessage
} from '../utils/methods/messageMethods';

export type BroadcastInteraction = ChatInputCommandInteraction | ChannelSelectMenuInteraction | ButtonInteraction | ContextMenuCommandInteraction;

export const sendSelectChannelTypes: ApplicationCommandOptionAllowedChannelTypes[] = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
	ChannelType.AnnouncementThread,
	ChannelType.PublicThread,
	ChannelType.PrivateThread
];

export enum BroadcastVariables {
	ChannelSelectCustomId = 'broadcastSendChannelSelect',
	ButtonGetRawCustomId = 'broadcastGetRawButton',
	ButtonUpdateRawCustomId = 'broadcastUpdateRawButton',
	ModalUpdateRawId = 'broadcastUpdateRawModal',
	LinkTextDisplayOptionId = 636074777,
	LinkTextDisplayRawId = 636074778,
	LinkErrorTextDisplayOptionId = 636074779,
	ContainerId = 72184951,
}

export const broadcastContainerBuilder = (channelId: string, messageId: string) =>
	new ContainerBuilder()
		.setAccentColor(15844367)
		.setId(BroadcastVariables.ContainerId)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('Choice the action to perform on this message :'))
		.addTextDisplayComponents(
			new TextDisplayBuilder()
				.setContent(`https://discord.com/channels/${envParseString('GUILD_ID')}/${channelId}/${messageId}`)
				.setId(BroadcastVariables.LinkTextDisplayOptionId)
		)
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Send\nSend the message to a specific channel :'))
		.addActionRowComponents(
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ChannelSelectMenuBuilder()
					.setCustomId(`${BroadcastVariables.ChannelSelectCustomId}`)
					.setPlaceholder('Select the channel to send the message to')
					.addChannelTypes(sendSelectChannelTypes)
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Update content\nUpdate content of the message :'))
		.addActionRowComponents(
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
				.setCustomId(`${BroadcastVariables.ButtonUpdateRawCustomId}`)
				.setLabel("Update Raw")
				.setStyle(ButtonStyle.Primary)
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Get raw content\nSend raw content of the message to dump channel :'))
		.addActionRowComponents(
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
				.setCustomId(`${BroadcastVariables.ButtonGetRawCustomId}`)
				.setLabel("Get Raw")
				.setStyle(ButtonStyle.Primary)
			)
		);

// BROADCAST SEND
export const sendBroadcast = async (interaction: BroadcastInteraction) => {
	
	const message = await verifyMessage(interaction, false, false);

	// Get target channel
	let broadcastChannel = interaction.isChatInputCommand() ? interaction.options.getChannel('channel', true) : interaction.channel;

	if (interaction instanceof ChannelSelectMenuInteraction) {
		const targetChannel = container.client.channels.cache.get(interaction.values[0]);
		if (!targetChannel || !sendSelectChannelTypes.includes(targetChannel?.type as ApplicationCommandOptionAllowedChannelTypes)) {
			return interactionRespond(interaction, '❌ Impossible de broadcast le message vers le canal sélectionné');
		}
		broadcastChannel = targetChannel;
	}

	if (!broadcastChannel || !('send' in broadcastChannel) || !('permissionsFor' in broadcastChannel) || !isTextBasedChannel(broadcastChannel)) {
		return interactionRespond(interaction, '❌ Channel de destination introuvable ou inaccessible');
	}

	try {
		const response = await sendLongMessageAsync(broadcastChannel, {
			content: message.content,
			embeds: message.embeds,
			files: message.attachments.map((att) => att.url)
		});
		return interactionRespond(interaction, `✅ Message broadcasté avec succès! ${response?.url}`);
	} catch (error) {
		container.logger.error('Erreur lors du broadcast:', error);
		return interactionRespond(interaction, "❌ Erreur lors de l'envoi du message. Vérifiez les permissions du bot.");
	}
};

// BROADCAST UPDATE RAW MODAL
export const updateRawBroadcastModal = async (interaction: BroadcastInteraction) => {

	const message = await verifyMessage(interaction, true, true);

	// Check if message is editable by the bot
	if ((message.author.id !== interaction.client.user?.id) && interaction instanceof ButtonInteraction) {
		return interaction.update({ components: [buildErrorModalMessage()] });
	}
	
	try {
		// Get editable raw message (JSON format for precise control)
		const editableRaw = buildEditableRawMessage(message);

		// Create modal with 4 fields: content, embeds (JSON), attachments, and message URL
		const modal = new ModalBuilder()
			.setCustomId(BroadcastVariables.ModalUpdateRawId)
			.setTitle('Edit Message');

		// Field 1: Message content
		const contentInput = new TextInputBuilder()
			.setCustomId('contentField')
			.setLabel('Message Content')
			.setStyle(TextInputStyle.Paragraph)
			.setValue(editableRaw.content)
			.setRequired(false);

		// Field 2: Embeds (JSON format for full control)
		const embedsInput = new TextInputBuilder()
			.setCustomId('embedsField')
			.setLabel('Embeds (JSON format)')
			.setStyle(TextInputStyle.Paragraph)
			.setValue(editableRaw.embedsJson)
			.setRequired(false)
			.setPlaceholder('[{"title": "Title", "description": "Text", "color": 5814783}]');

		// Field 3: Attachments (URLs, one per line)
		const attachmentsInput = new TextInputBuilder()
			.setCustomId('attachmentsField')
			.setLabel('Attachments (URLs, one per line)')
			.setStyle(TextInputStyle.Paragraph)
			.setValue(editableRaw.attachments)
			.setRequired(false)
			.setPlaceholder('https://cdn.discordapp.com/attachments/...');

		// Field 4: Message URL (reference field - DO NOT MODIFY)
		const messageUrlInput = new TextInputBuilder()
			.setCustomId('messageUrlField')
			.setLabel('Message URL (DO NOT MODIFY)')
			.setStyle(TextInputStyle.Short)
			.setValue(message.url)
			.setRequired(true);

		const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput);
		const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(embedsInput);
		const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(attachmentsInput);
		const row4 = new ActionRowBuilder<TextInputBuilder>().addComponents(messageUrlInput);

		modal.addComponents(row1, row2, row3, row4);

		return await interaction.showModal(modal);

	} catch (error) {
		container.logger.error('Erreur lors de l\'ouverture de la modale:', error);
		if (!interaction.replied && !interaction.deferred) {
			return interaction.reply({ content: "❌ Erreur lors de l'affichage de la modale.", flags: [MessageFlags.Ephemeral] });
		}
		return interaction.editReply({ content: "❌ Erreur lors de l'affichage de la modale." });
	}

};

// BROADCAST UPDATE RAW
export const updateRawBroadcast = async (interaction: ModalSubmitInteraction) => {
	try {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		// Extract message URL from the hidden field
		const messageUrl = interaction.fields.getTextInputValue('messageUrlField');

		// Parse Discord link: https://discord.com/channels/{guildId}/{channelId}/{messageId}
		const urlRegex = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
		const match = messageUrl.match(urlRegex);

		if (!match) {
			return interaction.editReply({ content: '❌ URL du message invalide.' });
		}

		const [_, _guildId, channelId, messageId] = match;

		// Fetch the channel
		const channel = await interaction.client.channels.fetch(channelId);
		if (!channel || !channel.isTextBased()) {
			return interaction.editReply({ content: '❌ Channel introuvable ou inaccessible.' });
		}

		// Fetch the message to update
		const messageToUpdate = await channel.messages.fetch(messageId);
		if (!messageToUpdate) {
			return interaction.editReply({ content: '❌ Message introuvable.' });
		}

		// Check if message is editable by the bot
		if (messageToUpdate.author.id !== interaction.client.user?.id) {
			return interaction.editReply({ content: '❌ Le bot ne peut modifier que ses propres messages.' });
		}

		// Get fields from modal
		const contentField = interaction.fields.getTextInputValue('contentField');
		const embedsField = interaction.fields.getTextInputValue('embedsField');
		const attachmentsField = interaction.fields.getTextInputValue('attachmentsField');

		// Parse the fields
		let parsedMessage;
		try {
			parsedMessage = parseRawMessage(contentField, embedsField, attachmentsField);
		} catch (error) {
			return interaction.editReply({ 
				content: `❌ Erreur de parsing: ${error instanceof Error ? error.message : 'Format invalide'}` 
			});
		}

		// Validate at least one field is present
		if (!parsedMessage.content && parsedMessage.embeds.length === 0 && parsedMessage.attachments.length === 0) {
			return interaction.editReply({ content: '❌ Le message doit contenir au moins du contenu, un embed ou un attachement.' });
		}

		// Update the message
		await messageToUpdate.edit({
			content: parsedMessage.content || null,
			embeds: parsedMessage.embeds,
			files: parsedMessage.attachments
		});

		return interaction.editReply({ 
			content: `✅ Message mis à jour avec succès!\n**Lien:** ${messageUrl}` 
		});

	} catch (error) {
		container.logger.error('Erreur lors de l\'update du message:', error);
		
		if (!interaction.replied && !interaction.deferred) {
			return interaction.reply({ 
				content: '❌ Erreur lors de la mise à jour du message.', 
				flags: [MessageFlags.Ephemeral] 
			});
		}
		
		return interaction.editReply({ content: '❌ Erreur lors de la mise à jour du message.' });
	}
};

// BROADCAST GET RAW
export const getRawBroadcast = async (interaction: BroadcastInteraction) => {

	const message = await verifyMessage(interaction, true, true);

	// Build copyable raw representation (Markdown for embeds, easy to copy/paste)
	const rawContent = buildCopyableRawMessage(message);

	const broadcastContainer = new ContainerBuilder()
		.setAccentColor(15844367)
		.setId(BroadcastVariables.ContainerId)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Metadata :'))
		.addTextDisplayComponents(
			new TextDisplayBuilder()
				.setContent(`**Raw message from ${escapeMarkdown(message.author.tag)}** (<@${message.author.id}>)\n**Original:** ${message.url}\n**Creation date:** ${message.createdAt.toLocaleDateString()}`)
				.setId(BroadcastVariables.LinkTextDisplayOptionId)
		)
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# RAW Message (Copyable) :'))
		.addTextDisplayComponents(
			new TextDisplayBuilder()
				.setContent(`\`\`\`\n${protectBackticks(rawContent)}\n\`\`\``)
				.setId(BroadcastVariables.LinkTextDisplayRawId)
		)

	if (interaction instanceof ButtonInteraction) {
		return interaction.update({ components: [broadcastContainer] });
	}

	return interaction.editReply({ components: [broadcastContainer] });
}

export const buildErrorModalMessage = () => {
	return new ContainerBuilder()
		.setAccentColor(15844367)
		.setId(BroadcastVariables.ContainerId)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Error :'))
		.addTextDisplayComponents(
			new TextDisplayBuilder()
				.setContent(`❌ Le bot ne peut modifier que ses propres messages.`)
				.setId(BroadcastVariables.LinkErrorTextDisplayOptionId)
		)
}