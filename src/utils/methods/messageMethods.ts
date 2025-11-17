import { ButtonInteraction, ChannelSelectMenuInteraction, ChatInputCommandInteraction, ComponentType, GuildMember, InteractionEditReplyOptions, InteractionUpdateOptions, Message, MessageFlags, TextDisplayBuilder } from 'discord.js';
import { BroadcastInteraction, BroadcastVariables } from '../../Services/broadcast.service';

/**
 * Check if a message is a bot message
 * @param message - The message to check
 * @returns true if the message is a bot message, false otherwise
 */
export const isBotMessage = (message: Message) => {
	return message.author.bot;
};

/**
 * Check if a message is a user message
 * @param message - The message to check
 * @returns true if the message is a user message, false otherwise
 */
export const isUserMessage = (message: Message) => {
	return !message.author.bot;
};

/**
 * Check if a message is owned by a member
 * @param message - The message to check
 * @param member - The member to check
 * @returns true if the message is owned by the member, false otherwise
 */
export const isMessageOwner = (message: Message, member: GuildMember) => {
	return message.author.id === member.id;
};

/**
 * Check the integrity of the message and the rights associated with it
 * @param interaction - Current interaction
 * @returns Message<boolean> - Message to work with
 */
export const verifyMessage = async (interaction: BroadcastInteraction, allowBot: boolean, allowUnpersonnal: boolean) => {
	if (interaction instanceof ChatInputCommandInteraction && !interaction.deferred && !interaction.replied)
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

	const interactionMember =
		interaction.member instanceof GuildMember ? interaction.member : await interaction.guild?.members.fetch(interaction.user.id);
	if (!interactionMember) {
		interactionRespond(interaction, '❌ Member not found');
		throw new Error('❌ Broadcast: Member not found');
	}

	let link = interaction instanceof ChatInputCommandInteraction ? interaction.options.getString('link', true) : '';

	if (interaction instanceof ChannelSelectMenuInteraction || interaction instanceof ButtonInteraction) {
		const broadcastContainer = interaction.message.components.find((c) => c.id === BroadcastVariables.ContainerId);
		if (!broadcastContainer || broadcastContainer.type !== ComponentType.Container) throw new Error('Broadcast container not found');

		const textDisplayComponent = broadcastContainer?.components.find((c) => c.id === BroadcastVariables.LinkTextDisplayOptionId);
		if (!textDisplayComponent || textDisplayComponent.type !== ComponentType.TextDisplay) throw new Error('Text display component not found');

		link = textDisplayComponent.content;
	}

	// Parse Discord link: https://discord.com/channels/{guildId}/{channelId}/{messageId}
	const urlRegex = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
	const match = link.match(urlRegex);
	console.log('LINK => ' + link);

	if (!match) {
		interactionRespond(interaction, '❌ Lien invalide. Format attendu: https://discord.com/channels/{guildId}/{channelId}/{messageId}');
		throw new Error('❌ Broadcast: Lien invalide. Format attendu: https://discord.com/channels/{guildId}/{channelId}/{messageId}');
	}

	const [_, _guildId, channelId, messageId] = match;

	// Fetch source channel
	const channel = await interaction.client.channels.fetch(channelId);
	if (!channel || !channel.isTextBased()) {
		interactionRespond(interaction, '❌ Channel introuvable ou inaccessible');
		throw new Error('❌ Broadcast: Channel introuvable ou inaccessible');
	}

	// Fetch source message
	const message = await channel.messages.fetch(messageId);
	if (!message) {
		interactionRespond(interaction, '❌ Message introuvable');
		throw new Error('❌ Broadcast: Message introuvable');
	}

	if (!allowBot && isBotMessage(message)) {
		interactionRespond(interaction, '❌ Vous ne pouvez pas broadcast un message du bot');
		throw new Error('❌ Broadcast: Vous ne pouvez pas broadcast un message du bot');
	}

	if (!allowUnpersonnal && !isMessageOwner(message, interactionMember)) {
		interactionRespond(interaction, "❌ Vous ne pouvez pas broadcast un message qui n'est pas votre");
		throw new Error('❌ Broadcast: Vous ne pouvez pas broadcast un message qui n\'est pas votre');
	}
	
	return message;
}

/**
 * Build simple raw message content for easy editing (includes attachments)
 * @param message - The Discord message
 * @returns Simple text content with attachments URLs
 */
export const buildSimpleRawMessage = (message: Message): string => {
	const parts: string[] = [];
	
	// Add message content
	if (message.content) {
		parts.push(message.content);
	}
	
	// Add attachments as URLs at the end
	if (message.attachments.size > 0) {
		if (parts.length > 0) parts.push('\n');
		message.attachments.forEach((att) => {
			parts.push(att.url);
		});
	}
	
	return parts.join('\n');
};

export function protectBackticks(str: string): string {
    // Ajoute un zéro-width space après chaque backtick pour empêcher l'interprétation
    return str.replace(/`/g, '\u200B`');
}

/**
 * Response to interaction
 * @param interaction - Current interaction
 * @param content - Content of response
 * @returns Promise<message<boolean>>
 */
export const interactionRespond = async (interaction: BroadcastInteraction, content: string) => {
	if (interaction instanceof ChannelSelectMenuInteraction || interaction instanceof ButtonInteraction) {
		return interaction.update({ components: [new TextDisplayBuilder().setContent(content)] } as InteractionUpdateOptions);
	}

	return interaction.editReply({ content } as InteractionEditReplyOptions);
};
