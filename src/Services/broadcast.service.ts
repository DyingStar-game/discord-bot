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
import { buildSimpleRawMessage, interactionRespond, protectBackticks, verifyMessage } from '../utils/methods/messageMethods';

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
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Get raw content\nSend raw content of the message to dump channel :'))
		.addActionRowComponents(
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
				.setCustomId(`${BroadcastVariables.ButtonGetRawCustomId}`)
				.setLabel("Get Raw")
				.setStyle(ButtonStyle.Primary)
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
		await sendLongMessageAsync(broadcastChannel, {
			content: message.content,
			embeds: message.embeds,
			files: message.attachments.map((att) => att.url)
		});
		return interactionRespond(interaction, '✅ Message broadcasté avec succès!');
	} catch (error) {
		container.logger.error('Erreur lors du broadcast:', error);
		return interactionRespond(interaction, "❌ Erreur lors de l'envoi du message. Vérifiez les permissions du bot.");
	}
};

// BROADCAST UPDATE RAW MODAL
export const updateRawBroadcastModal = async (interaction: BroadcastInteraction) => {

	const message = await verifyMessage(interaction, true, true);
	
	try {
		// Get simple raw content with attachments
		const rawContent = buildSimpleRawMessage(message);

		// Create modal with raw content
		const modal = new ModalBuilder()
			.setCustomId(BroadcastVariables.ModalUpdateRawId)
			.setTitle('Raw Message Content');

		const rawContentInput = new TextInputBuilder()
			.setCustomId('rawContentField')
			.setLabel('Message Content')
			.setStyle(TextInputStyle.Paragraph)
			.setValue(rawContent)
			.setRequired(true);

		const metadataInput = new TextInputBuilder()
			.setCustomId('metadataField')
			.setLabel('Metadata (Read-only)')
			.setStyle(TextInputStyle.Paragraph)
			.setValue(`Original: ${message.url}\nAuthor: ${message.author.tag}\nMessage ID: ${message.id}`)
			.setRequired(false);

		const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(rawContentInput);
		const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(metadataInput);

		modal.addComponents(firstActionRow, secondActionRow);

		return await interaction.showModal(modal);

	} catch (error) {
		container.logger.error('Erreur lors du getRaw:', error);
		if (!interaction.replied && !interaction.deferred) {
			return interaction.reply({ content: "❌ Erreur lors de l'affichage du message raw.", flags: [MessageFlags.Ephemeral] });
		}
		return interaction.reply({ content: "❌ Erreur lors de l'affichage du message raw.", flags: [MessageFlags.Ephemeral] });
	}

};

// BROADCAST UPDATE RAW
export const updateRawBroadcast = async (interaction: ModalSubmitInteraction) => {
	console.log('==> updateRawBroadcast');
	console.log(interaction);
}

// BROADCAST GET RAW
export const getRawBroadcast = async (interaction: BroadcastInteraction) => {

	const message = await verifyMessage(interaction, true, true);

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
				.setContent(`\`\`\`json\n${protectBackticks(buildSimpleRawMessage(message))}\n\`\`\``)
				.setId(BroadcastVariables.LinkTextDisplayRawId)
		)

	if (interaction instanceof ButtonInteraction) {
		return interaction.update({ components: [broadcastContainer] });
	}

	return interaction.editReply({ components: [broadcastContainer] });
}