import { ServiceException } from '../../lib/Error/class/serviceException';

/**
 * Split a text into chunks of a given maximum length
 * @param text - The text to split into chunks
 * @param maxLength - The maximum length of each chunk
 * @returns An array of strings, each representing a chunk of the original text
 */
export const splitIntoChunks = (text: string = '', maxLength: number = 2000): string[] => {
	if (text.length <= maxLength) {
		return [text];
	}

	const chunks: string[] = [];
	const lines = text.split('\n');
	let currentChunk = '';

	for (const line of lines) {
		if (line.length > maxLength) {
			if (currentChunk) {
				chunks.push(currentChunk.trim());
				currentChunk = '';
			}

			const words = line.split(' ');
			let longLineChunk = '';

			for (const word of words) {
				if ((longLineChunk + word + ' ').length > maxLength) {
					if (longLineChunk) {
						chunks.push(longLineChunk.trim());
						longLineChunk = word + ' ';
					} else {
						chunks.push(word.substring(0, maxLength));
						longLineChunk = word.substring(maxLength) + ' ';
					}
				} else {
					longLineChunk += word + ' ';
				}
			}

			if (longLineChunk) {
				currentChunk = longLineChunk.trim() + '\n';
			}
			continue;
		}

		if ((currentChunk + line + '\n').length > maxLength) {
			chunks.push(currentChunk.trim());
			currentChunk = line + '\n';
		} else {
			currentChunk += line + '\n';
		}
	}

	if (currentChunk) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
};

/**
 * Formats a string by replacing placeholders with arguments.
 * Usage: stringFormat("Hello {0}, you have {1} messages.", "Alice", 5)
 * => "Hello Alice, you have 5 messages."
 * @param str - The string with placeholders in the form {0}, {1}, etc.
 * @param args - Values to insert into the string.
 * @returns The formatted string.
 */
export function stringFormat(str: string, ...args: (string | number)[]): string {
	return str.replace(/{(\w+)}/g, (match, key) => args[Number(key)]?.toString() ?? match);
}

/**
 * Parses a Discord message link (https://discord.com/channels/{guildId}/{channelId}/{messageId})
 * and returns the guildId, channelId, and messageId if valid, otherwise throws a ServiceException.
 * @param link - The Discord message link
 * @returns An object containing guildId, channelId, and messageId if parsing is successful, otherwise throws a ServiceException.
 */
export function parseDiscordMessage(link: string) {
	const urlRegex = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
	const match = new RegExp(urlRegex).exec(link);
	const [_, guildId, channelId, messageId] = match ?? [];

	if (!guildId || !channelId || !messageId)
		throw new ServiceException({
			identifier: 'parseDiscordMessage',
			message: 'Invalid Discord message link. Expected format: https://discord.com/channels/{guildId}/{channelId}/{messageId}',
			context: { link }
		});

	return { guildId, channelId, messageId };
}
