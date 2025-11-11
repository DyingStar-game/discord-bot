import { ButtonInteraction, ChannelSelectMenuInteraction, ChatInputCommandInteraction, ComponentType, escapeMarkdown, GuildMember, InteractionEditReplyOptions, InteractionUpdateOptions, Message, MessageFlags, TextDisplayBuilder } from 'discord.js';
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
 * Build new message with original RAW message and different metadata  
 * @param message 
 * @returns parts string[] - Different part of the return message
 */
export const buildRawMessage = (message: Message): string => {
	const parts: string[] = [];

	// === TEST CONTENT ===
	if (message.content) {
		parts.push('**📝 Content:**');
		parts.push('```');
		// Échapper le markdown mais garder le texte brut lisible
		parts.push(escapeMarkdown(message.content));
		parts.push('```');
	}

	// === ATTACHMENTS ===
	if (message.attachments.size > 0) {
		parts.push('\n**📎 Attachments:**');
		message.attachments.forEach((att, index) => {
			parts.push(`${index + 1}. ${att.name} - ${att.url}`);
		});
	}

	// === EMBEDS ===
	if (message.embeds.length > 0) {
		parts.push('\n**📋 Embeds:**');
		message.embeds.forEach((embed, index) => {
			const embedInfo: any = {
				type: embed.data.type || 'rich'
			};

			if (embed.data.title) embedInfo.title = embed.data.title;
			if (embed.data.description) embedInfo.description = embed.data.description;
			if (embed.data.url) embedInfo.url = embed.data.url;
			if (embed.data.color) embedInfo.color = embed.data.color;
			if (embed.data.footer?.text) embedInfo.footer = embed.data.footer.text;
			if (embed.data.author?.name) embedInfo.author = embed.data.author.name;
			if (embed.data.image?.url) embedInfo.image = embed.data.image.url;
			if (embed.data.thumbnail?.url) embedInfo.thumbnail = embed.data.thumbnail.url;

			parts.push(`**Embed ${index + 1}:**`);
			parts.push('```json');
			parts.push(JSON.stringify(embedInfo, null, 2));
			parts.push('```');
		});
	}

	// === STICKERS ===
	if (message.stickers.size > 0) {
		parts.push('\n**🎨 Stickers:**');
		message.stickers.forEach((sticker) => {
			parts.push(`- ${sticker.name} (ID: ${sticker.id})`);
		});
	}

	// === METADATA ===
	parts.push('\n**ℹ️ Metadata:**');
	parts.push(`- Author: ${escapeMarkdown(message.author.tag)} (ID: ${message.author.id})`);
	parts.push(`- Channel: <#${message.channelId}> (ID: ${message.channelId})`);
	parts.push(`- Message ID: ${message.id}`);
	parts.push(`- Created: <t:${Math.floor(message.createdTimestamp / 1000)}:F>`);
	if (message.editedTimestamp) {
		parts.push(`- Edited: <t:${Math.floor(message.editedTimestamp / 1000)}:F>`);
	}

	return parts.join('\n');
};

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
