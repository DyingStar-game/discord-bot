import { isTextBasedChannel } from '@sapphire/discord.js-utilities';
import { container, UserError } from '@sapphire/framework';
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
import { 
	buildCopyableRawMessage,
	buildEditableRawMessage,
	interactionRespond, 
	protectBackticks, 
	verifyMessage, 
	parseRawMessage
} from '../utils/helper/messageHelper';
import { ServiceException } from '../lib/Error/class/serviceException';
import { sendLongMessageAsync } from '../utils/helper/channelHelper';

export type BroadcastInteraction = ChatInputCommandInteraction | ChannelSelectMenuInteraction | ButtonInteraction | ContextMenuCommandInteraction;

export const sendSelectChannelTypes: ApplicationCommandOptionAllowedChannelTypes[] = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
	ChannelType.AnnouncementThread,
	ChannelType.PublicThread,
	ChannelType.PrivateThread
];

/**
 * List of components ID
 */
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

// Storage Map for pending button interaction
const pendingButtonInteractions = new Map<string, ButtonInteraction>();

/**
 * Build Boradcast Component V2
 * @param channelId 
 * @param messageId 
 * @returns Component V2
 */
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

/**
 * Send target message to specify channel
 * @param interaction 
 * @returns Message<boolean>
 */
export const sendBroadcast = async (interaction: BroadcastInteraction) => {
	
	const message = await verifyMessage(interaction, false, false, 'sendBroadcast');

	// Get target channel
	let broadcastChannel = interaction.isChatInputCommand() ? interaction.options.getChannel('channel', true) : interaction.channel;

	if (interaction instanceof ChannelSelectMenuInteraction) {
		const targetChannel = container.client.channels.cache.get(interaction.values[0]);
		if (!targetChannel || !sendSelectChannelTypes.includes(targetChannel?.type as ApplicationCommandOptionAllowedChannelTypes)) {
			throw new UserError({
				identifier: 'sendBroadcast',
				message: 'Cannot broadcast message to selected channel',
				context: { interaction, command: this }
			});
		}
		broadcastChannel = targetChannel;
	}

	if (!broadcastChannel || !('send' in broadcastChannel) || !('permissionsFor' in broadcastChannel) || !isTextBasedChannel(broadcastChannel)) {
		throw new UserError({
			identifier: 'sendBroadcast',
			message: 'Destination channel not found or inaccessible',
			context: { interaction, command: this }
		});
	}

	try {
		const response = await sendLongMessageAsync(broadcastChannel, {
			content: message.content,
			embeds: message.embeds,
			files: message.attachments.map((att) => att.url)
		});
		return interactionRespond(interaction, `✅ Message broadcasted successfully ! ${response?.url}`);
	} catch (_) {
		throw new ServiceException({
			identifier: 'sendBroadcast',
			message: 'Error sending message. Check bot permissions.',
			context: { interaction, command: this }
		});
	}
};

/**
 * Build update raw message modal
 * @param interaction 
 * @returns Modal
 */
export const updateRawBroadcastModal = async (interaction: BroadcastInteraction) => {

	const message = await verifyMessage(interaction, true, true, 'updateRawBroadcastModal');

	// Check if message is editable by the bot
	if ((message.author.id !== interaction.client.user?.id) && interaction instanceof ButtonInteraction) {
		return interaction.update({ components: [buildErrorModalMessage()] });
	}
	
	try {
		// Get editable raw message (JSON format for precise control)
		const editableRaw = buildEditableRawMessage(message);

		// Store button interaction for later update
		if (interaction instanceof ButtonInteraction) {
			const uniqueKey = `${interaction.user.id}-${Date.now()}`;
			pendingButtonInteractions.set(uniqueKey, interaction);
			
			// Clean up after 15 minutes
			setTimeout(() => {
				pendingButtonInteractions.delete(uniqueKey);
			}, 15 * 60 * 1000);
		}

		// Create modal with 5 fields: content, embeds (JSON), attachments, message URL, and interaction key
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

		// Field 5: Interaction key (hidden - DO NOT MODIFY)
		const interactionKeyInput = new TextInputBuilder()
			.setCustomId('interactionKeyField')
			.setLabel('Key (DO NOT MODIFY)')
			.setStyle(TextInputStyle.Short)
			.setValue(interaction instanceof ButtonInteraction ? `${interaction.user.id}-${Date.now()}` : '')
			.setRequired(false);

		const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput);
		const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(embedsInput);
		const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(attachmentsInput);
		const row4 = new ActionRowBuilder<TextInputBuilder>().addComponents(messageUrlInput);
		const row5 = new ActionRowBuilder<TextInputBuilder>().addComponents(interactionKeyInput);

		modal.addComponents(row1, row2, row3, row4, row5);

		return await interaction.showModal(modal);

	} catch (error) {
		container.logger.error('Erreur when opening modal:', error);
		if (!interaction.replied && !interaction.deferred) {
			throw new ServiceException({
				identifier: 'updateRawBroadcastModal',
				message: '❌ Error when displaying modal.',
				context: { interaction, command: this }
			});
		}
		throw new ServiceException({
				identifier: 'updateRawBroadcastModal',
				message: '❌ Error when displaying modal.',
				context: { interaction, command: this }
			});
	}

};

/**
 * Update bot's target message with updated modal content 
 * @param interaction 
 * @returns Message<boolean>
 */
export const updateRawBroadcast = async (interaction: ModalSubmitInteraction) => {
	try {
		// Get interaction key to find the original button interaction
		const interactionKey = interaction.fields.getTextInputValue('interactionKeyField');
		const buttonInteraction = interactionKey ? pendingButtonInteractions.get(interactionKey) : null;

		// If we have the button interaction, defer its update first
		if (buttonInteraction && !buttonInteraction.replied && !buttonInteraction.deferred) {
			await buttonInteraction.deferUpdate();
		}

		// Also defer the modal reply for feedback
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		// Extract message URL from the hidden field
		const messageUrl = interaction.fields.getTextInputValue('messageUrlField');

		// Parse Discord link: https://discord.com/channels/{guildId}/{channelId}/{messageId}
		const urlRegex = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
		const match = messageUrl.match(urlRegex);

		if (!match) {
			throw new UserError({
				identifier: 'updateRawBroadcast',
				message: '❌ Invalid message URL.',
				context: { interaction, command: this }
			});
		}

		const [_, _guildId, channelId, messageId] = match;

		// Fetch the channel
		const channel = await interaction.client.channels.fetch(channelId);
		if (!channel || !channel.isTextBased()) {
			throw new UserError({
				identifier: 'updateRawBroadcast',
				message: '❌ Channel not found or inaccessible.',
				context: { interaction, command: this }
			});
		}

		// Fetch the message to update
		const messageToUpdate = await channel.messages.fetch(messageId);
		if (!messageToUpdate) {
			throw new UserError({
				identifier: 'updateRawBroadcast',
				message: '❌ Message not found.',
				context: { interaction, command: this }
			});
		}

		// Check if message is editable by the bot
		if (messageToUpdate.author.id !== interaction.client.user?.id) {
			throw new UserError({
				identifier: 'updateRawBroadcast',
				message: '❌ Bot can only mofified it\'s own messages.',
				context: { interaction, command: this }
			});
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
			throw new UserError({
				identifier: 'updateRawBroadcast',
				message: `❌ Parsing error: ${error instanceof Error ? error.message : 'Invalid format'}`,
				context: { interaction, command: this }
			});
		}

		// Validate at least one field is present
		if (!parsedMessage.content && parsedMessage.embeds.length === 0 && parsedMessage.attachments.length === 0) {
			throw new UserError({
				identifier: 'updateRawBroadcast',
				message: '❌ Message must contain at least content, embed or attachement.',
				context: { interaction, command: this }
			});
		}

		// Update the message
		await messageToUpdate.edit({
			content: parsedMessage.content || null,
			embeds: parsedMessage.embeds,
			files: parsedMessage.attachments
		});

		// Update the original component V2 with success message
		if (buttonInteraction) {
			try {
				await buttonInteraction.editReply({ 
					components: [buildSuccessContainer(messageUrl)]
				});
				
				// Clean up the stored interaction
				if (interactionKey) {
					pendingButtonInteractions.delete(interactionKey);
				}

				// Delete the ephemeral modal response since success is shown in component
				return interaction.deleteReply();

			} catch (error) {
				throw new ServiceException({
					identifier: 'updateRawBroadcast',
					message: '❌ Error when updating component.',
					context: { interaction, command: this }
				});
			}
		}

		// If no button interaction (shouldn't happen), send confirmation
		return interaction.editReply({ 
			content: `✅ Update message successfully !\n\n**Link:** ${messageUrl}` 
		});
		
	} catch (error) {
		container.logger.error('Error when updating message :', error);
		
		if (!interaction.replied && !interaction.deferred) {
			throw new ServiceException({
				identifier: 'updateRawBroadcast',
				message: '❌ Error when updating message.',
				context: { interaction, command: this }
			});
		}
		
		throw new ServiceException({
			identifier: 'updateRawBroadcast',
			message: '❌ Error when updating message.',
			context: { interaction, command: this }
		});
	}
};

/**
 * Get raw version of a target message
 * @param interaction 
 * @returns Component V2
 */
export const getRawBroadcast = async (interaction: BroadcastInteraction) => {

	const message = await verifyMessage(interaction, true, true, 'getRawBroadcast');

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
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# RAW Message :'))
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

/**
 * Build error messge with component V2 format
 * @returns Component V2
 */
export const buildErrorModalMessage = () => {
	return new ContainerBuilder()
		.setAccentColor(15844367)
		.setId(BroadcastVariables.ContainerId)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Error :'))
		.addTextDisplayComponents(
			new TextDisplayBuilder()
				.setContent(`❌ Bot can only modified it's own messages`)
				.setId(BroadcastVariables.LinkErrorTextDisplayOptionId)
		)
}

/**
 * Build success container after message update
 * @param messageUrl - URL of the updated message
 * @returns Component V2
 */
export const buildSuccessContainer = (messageUrl: string) => {
	return new ContainerBuilder()
		.setAccentColor(5763719) // Green color
		.setId(BroadcastVariables.ContainerId)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Success'))
		.addTextDisplayComponents(
			new TextDisplayBuilder()
				.setContent(`Update message successfully !\n\n**Link:** ${messageUrl}`)
				.setId(BroadcastVariables.LinkTextDisplayOptionId)
		);
};
