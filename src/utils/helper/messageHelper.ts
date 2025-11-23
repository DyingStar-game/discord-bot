import {
	ButtonInteraction,
	ChannelSelectMenuInteraction,
	ChatInputCommandInteraction,
	ComponentType,
	GuildMember,
	InteractionEditReplyOptions,
	InteractionUpdateOptions,
	Message,
	MessageFlags,
	TextDisplayBuilder,
	EmbedBuilder,
	APIEmbed
} from 'discord.js';
import { BroadcastInteraction, BroadcastVariables } from '../../Services/broadcast.service';
import { ServiceException } from '../../lib/Error/class/serviceException';
import { UserError } from '@sapphire/framework';
import { parseDiscordMessage } from './stringHelper';

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
 * @param allowBot - Allow bot messages
 * @param allowUnpersonnal - Allow messages from other users
 * @returns Message<boolean> - Message to work with
 */
export const verifyMessage = async (interaction: BroadcastInteraction, allowBot: boolean, allowUnpersonnal: boolean, method: string) => {
	if (interaction instanceof ChatInputCommandInteraction && !interaction.deferred && !interaction.replied)
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

	const interactionMember =
		interaction.member instanceof GuildMember ? interaction.member : await interaction.guild?.members.fetch(interaction.user.id);
	if (!interactionMember)
		throw new ServiceException({
			identifier: method,
			message: '❌ Interaction member not found',
			context: { interaction, command: this }
		});

	let link = interaction instanceof ChatInputCommandInteraction ? interaction.options.getString('link', true) : '';

	if (interaction instanceof ChannelSelectMenuInteraction || interaction instanceof ButtonInteraction) {
		const broadcastContainer = interaction.message.components.find((c) => c.id === BroadcastVariables.ContainerId);
		if (!broadcastContainer || broadcastContainer.type !== ComponentType.Container)
			throw new ServiceException({
				identifier: method,
				message: '❌ Broadcast container not found',
				context: { interaction, command: this }
			});
		const textDisplayComponent = broadcastContainer?.components.find((c) => c.id === BroadcastVariables.LinkTextDisplayOptionId);
		if (!textDisplayComponent || textDisplayComponent.type !== ComponentType.TextDisplay)
			throw new ServiceException({
				identifier: method,
				message: '❌ Broadcast container not found',
				context: { interaction, command: this }
			});
		link = textDisplayComponent.content;
	}

	const { channelId, messageId } = parseDiscordMessage(link);

	// Fetch source channel
	const channel = await interaction.client.channels.fetch(channelId);
	if (!channel?.isTextBased()) {
		throw new UserError({
			identifier: method,
			message: 'Channel not found or inaccessible',
			context: { interaction, command: this }
		});
	}

	// Fetch source message
	const message = await channel.messages.fetch(messageId);
	if (!message)
		throw new UserError({
			identifier: method,
			message: 'Message not found',
			context: { interaction, command: this }
		});

	if (!allowBot && isBotMessage(message)) {
		throw new UserError({
			identifier: method,
			message: 'You cannot broadcast a bot message',
			context: { interaction, command: this }
		});
	}

	if (!allowUnpersonnal && !isMessageOwner(message, interactionMember)) {
		throw new UserError({
			identifier: method,
			message: 'You cannot broadcast a message that is not yours',
			context: { interaction, command: this }
		});
	}

	return message;
};

/**
 * Convert an embed to Markdown format (copyable)
 * @param embed - Discord embed object
 * @returns Markdown string representation
 */
export const embedToMarkdown = (embed: APIEmbed): string => {
	const parts: string[] = [];

	// Author
	if (embed.author) {
		parts.push(`**${embed.author.name}**`);
		if (embed.author.url) {
			parts[parts.length - 1] = `[${embed.author.name}](${embed.author.url})`;
		}
	}

	// Title
	if (embed.title) {
		let title = `## ${embed.title}`;
		if (embed.url) {
			title = `## [${embed.title}](${embed.url})`;
		}
		parts.push(title);
	}

	// Description
	if (embed.description) {
		parts.push(embed.description);
	}

	// Fields
	if (embed.fields && embed.fields.length > 0) {
		for (const field of embed.fields) {
			parts.push(`**${field.name}**`);
			parts.push(field.value);
		}
	}

	// Image
	if (embed.image?.url) {
		parts.push(`![Image](${embed.image.url})`);
	}

	// Thumbnail
	if (embed.thumbnail?.url) {
		parts.push(`![Thumbnail](${embed.thumbnail.url})`);
	}

	// Footer
	if (embed.footer) {
		parts.push(`*${embed.footer.text}*`);
	}

	// Timestamp
	if (embed.timestamp) {
		const date = new Date(embed.timestamp);
		parts.push(`*${date.toLocaleString()}*`);
	}

	return parts.join('\n');
};

/**
 * Serialize embeds from a message to JSON string (for editing)
 * @param message - The Discord message
 * @returns JSON string of embeds or empty string
 */
export const serializeEmbeds = (message: Message): string => {
	if (message.embeds.length === 0) return '';

	try {
		const embedsData = message.embeds.map((embed) => embed.toJSON());
		return JSON.stringify(embedsData, null, 2);
	} catch (error) {
		console.error('Error serializing embeds:', error);
		return '';
	}
};

/**
 * Serialize attachments from a message to URLs string (one per line)
 * @param message - The Discord message
 * @returns URLs string or empty string
 */
export const serializeAttachments = (message: Message): string => {
	if (message.attachments.size === 0) return '';

	return message.attachments.map((att) => att.url).join('\n');
};

/**
 * Build copyable raw message representation (Markdown format for embeds)
 * Used for Get Raw feature - easy to copy/paste
 * @param message - The Discord message
 * @returns Copyable raw message string
 */
export const buildCopyableRawMessage = (message: Message): string => {
	const sections: string[] = [];

	// Content section
	if (message.content) {
		sections.push(message.content);
		sections.push('');
	}

	// Embeds section (converted to Markdown)
	if (message.embeds.length > 0) {
		message.embeds.forEach((embed, index) => {
			if (message.embeds.length > 1) {
				sections.push(`--- Embed ${index + 1} ---`);
			}
			sections.push(embedToMarkdown(embed.toJSON()));
			sections.push('');
		});
	}

	// Attachments section
	if (message.attachments.size > 0) {
		sections.push('--- Attachments ---');
		message.attachments.forEach((att) => {
			sections.push(att.url);
		});
		sections.push('');
	}

	return sections.join('\n').trim();
};

/**
 * Build editable raw message representation (JSON for embeds)
 * Used for Update Raw feature - precise control
 * @param message - The Discord message
 * @returns Object with separate content, embeds JSON, and attachments
 */
export const buildEditableRawMessage = (
	message: Message
): {
	content: string;
	embedsJson: string;
	attachments: string;
} => {
	return {
		content: message.content || '',
		embedsJson: serializeEmbeds(message),
		attachments: serializeAttachments(message)
	};
};

/**
 * Parse raw message content from separate fields
 * @param contentField - Content field from modal
 * @param embedsField - Embeds field from modal (JSON format)
 * @param attachmentsField - Attachments field from modal (URLs, one per line)
 * @returns Parsed message with content, embeds, and attachments
 */
export const parseRawMessage = (
	contentField: string,
	embedsField: string,
	attachmentsField: string
): {
	content: string;
	embeds: EmbedBuilder[];
	attachments: string[];
} => {
	const content = contentField.trim();
	const embeds: EmbedBuilder[] = [];
	const attachments: string[] = [];

	// Parse embeds from JSON
	if (embedsField.trim()) {
		try {
			const embedsData = JSON.parse(embedsField.trim());

			// Handle both array and single object
			const embedsArray = Array.isArray(embedsData) ? embedsData : [embedsData];

			for (const embedData of embedsArray) {
				try {
					embeds.push(new EmbedBuilder(embedData));
				} catch (e) {
					console.error('Failed to parse individual embed:', e);
				}
			}
		} catch (e) {
			console.error('Failed to parse embeds JSON:', e);
			throw new Error('Format JSON des embeds invalide. Vérifiez la syntaxe.');
		}
	}

	// Parse attachments from URLs
	if (attachmentsField.trim()) {
		const urls = attachmentsField
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));

		attachments.push(...urls);
	}

	return { content, embeds, attachments };
};

/**
 * Protect backticks in string for code block display
 * @param str - String to protect
 * @returns Protected string
 */
export function protectBackticks(str: string): string {
	// Add zero-width space after each backtick to prevent interpretation
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
