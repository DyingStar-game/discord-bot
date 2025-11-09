import { isTextBasedChannel } from '@sapphire/discord.js-utilities';
import { container } from '@sapphire/framework';
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
import { sendLongMessageAsync } from '../utils/methods/channelMethods';
import { isBotMessage, isMessageOwner } from '../utils/methods/messageMethods';

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
	if (!interactionMember) {
		return interactionRespond(interaction, '❌ Member not found');
	}

	let link = interaction instanceof ChatInputCommandInteraction ? interaction.options.getString('link', true) : '';

	if (interaction instanceof ChannelSelectMenuInteraction) {
		const broadcastContainer = interaction.message.components.find((c) => c.id === BroadcastVariables.ContainerId);
		if (!broadcastContainer || broadcastContainer.type !== ComponentType.Container) throw new Error('Broadcast container not found');

		const textDisplayComponent = broadcastContainer?.components.find((c) => c.id === BroadcastVariables.LinkTextDisplayOptionId);
		if (!textDisplayComponent || textDisplayComponent.type !== ComponentType.TextDisplay) throw new Error('Text display component not found');

		link = textDisplayComponent.content;
	}

	// Parse Discord link: https://discord.com/channels/{guildId}/{channelId}/{messageId}
	const urlRegex = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
	const match = link.match(urlRegex);

	if (!match) {
		return interactionRespond(interaction, '❌ Lien invalide. Format attendu: https://discord.com/channels/{guildId}/{channelId}/{messageId}');
	}

	const [_, _guildId, channelId, messageId] = match;

	// Fetch source channel
	const channel = await interaction.client.channels.fetch(channelId);
	if (!channel || !channel.isTextBased()) {
		return interactionRespond(interaction, '❌ Channel introuvable ou inaccessible ');
	}

	// Fetch source message
	const message = await channel.messages.fetch(messageId);
	if (!message) {
		return interactionRespond(interaction, '❌ Message introuvable');
	}

	if (isBotMessage(message)) {
		return interactionRespond(interaction, '❌ Vous ne pouvez pas broadcast un message du bot');
	}

	if (!isMessageOwner(message, interactionMember))
		return interactionRespond(interaction, "❌ Vous ne pouvez pas broadcast un message qui n'est pas votre");

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

const interactionRespond = async (interaction: BroadcastInteraction, content: string) => {
	if (interaction instanceof ChannelSelectMenuInteraction) {
		return interaction.update({ components: [new TextDisplayBuilder().setContent(content)] } as InteractionUpdateOptions);
	}

	return interaction.editReply({ content } as InteractionEditReplyOptions);
};
