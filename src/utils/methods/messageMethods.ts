import { GuildMember, Message } from 'discord.js';

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
