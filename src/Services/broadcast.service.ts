import { isTextBasedChannel } from '@sapphire/discord.js-utilities';
import { container, UserError } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import {
	ActionRowBuilder,
	ApplicationCommandOptionAllowedChannelTypes,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	ComponentType,
	ContainerBuilder,
	GuildMember,
	InteractionEditReplyOptions,
	InteractionUpdateOptions,
	MessageActionRowComponentBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder
} from 'discord.js';
import { ServiceException } from '../lib/Error/class/serviceException';
import { sendLongMessageAsync } from '../utils/helper/channelHelper';
import { isBotMessage, isMessageOwner } from '../utils/helper/messageHelper';

export type BroadcastInteraction = ChatInputCommandInteraction | ChannelSelectMenuInteraction;

export const sendSelectChannelTypes: ApplicationCommandOptionAllowedChannelTypes[] = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
	ChannelType.AnnouncementThread,
	ChannelType.PublicThread,
	ChannelType.PrivateThread
];

export enum BroadcastVariables {
	ChannelSelectCustomId = 'broadcastSendChannelSelect',
	LinkTextDisplayOptionId = 636074777,
	ContainerId = 72184951
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
		);

export const sendBroadcast = async (interaction: BroadcastInteraction) => {
	if (interaction instanceof ChatInputCommandInteraction && !interaction.deferred && !interaction.replied)
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

	const interactionMember =
		interaction.member instanceof GuildMember ? interaction.member : await interaction.guild?.members.fetch(interaction.user.id);
	if (!interactionMember)
		throw new ServiceException({
			identifier: 'sendBroadcast',
			message: '❌ Interaction member not found',
			context: { interaction, command: this }
		});

	let link = interaction instanceof ChatInputCommandInteraction ? interaction.options.getString('link', true) : '';

	if (interaction instanceof ChannelSelectMenuInteraction) {
		const broadcastContainer = interaction.message.components.find((c) => c.id === BroadcastVariables.ContainerId);
		if (!broadcastContainer || broadcastContainer.type !== ComponentType.Container)
			throw new ServiceException({
				identifier: 'sendBroadcast',
				message: '❌ Broadcast container not found',
				context: { interaction, command: this }
			});

		const textDisplayComponent = broadcastContainer?.components.find((c) => c.id === BroadcastVariables.LinkTextDisplayOptionId);
		if (!textDisplayComponent || textDisplayComponent.type !== ComponentType.TextDisplay)
			throw new ServiceException({
				identifier: 'sendBroadcast',
				message: '❌ Text display component not found',
				context: { interaction, command: this }
			});

		link = textDisplayComponent.content;
	}

	// Parse Discord link: https://discord.com/channels/{guildId}/{channelId}/{messageId}
	const urlRegex = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
	const match = link.match(urlRegex);

	if (!match)
		throw new UserError({
			identifier: 'sendBroadcast',
			message: 'Lien invalide. Format attendu: https://discord.com/channels/{guildId}/{channelId}/{messageId}',
			context: { interaction, command: this }
		});

	const [_, _guildId, channelId, messageId] = match;

	// Fetch source channel
	const channel = await interaction.client.channels.fetch(channelId);
	if (!channel || !channel.isTextBased()) {
		throw new UserError({
			identifier: 'sendBroadcast',
			message: 'Channel not found or inaccessible',
			context: { interaction, command: this }
		});
	}

	// Fetch source message
	const message = await channel.messages.fetch(messageId);
	if (!message)
		throw new UserError({
			identifier: 'sendBroadcast',
			message: 'Message not found',
			context: { interaction, command: this }
		});

	if (isBotMessage(message))
		throw new UserError({
			identifier: 'sendBroadcast',
			message: 'You cannot broadcast a bot message',
			context: { interaction, command: this }
		});

	if (!isMessageOwner(message, interactionMember))
		throw new UserError({
			identifier: 'sendBroadcast',
			message: 'You cannot broadcast a message that is not yours',
			context: { interaction, command: this }
		});

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
		await sendLongMessageAsync(broadcastChannel, {
			content: message.content,
			embeds: message.embeds,
			files: message.attachments.map((att) => att.url)
		});
		return interactionRespond(interaction, '✅ Message broadcasted successfully!');
	} catch (_) {
		throw new ServiceException({
			identifier: 'sendBroadcast',
			message: 'Error sending message. Check bot permissions.',
			context: { interaction, command: this }
		});
	}
};

const interactionRespond = async (interaction: BroadcastInteraction, content: string) => {
	if (interaction instanceof ChannelSelectMenuInteraction) {
		return interaction.update({ components: [new TextDisplayBuilder().setContent(content)] } as InteractionUpdateOptions);
	}

	return interaction.editReply({ content } as InteractionEditReplyOptions);
};
