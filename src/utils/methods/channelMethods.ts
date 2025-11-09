import {
	GuildMemberResolvable,
	MessageCreateOptions,
	NewsChannel,
	PermissionFlagsBits,
	PermissionResolvable,
	TextChannel,
	ThreadChannel,
	VoiceChannel
} from 'discord.js';
import { splitIntoChunks } from './stringMethods';

/**
 * Send a long message to a channel
 * @param channel - The channel to send the message to
 * @param options - The options for the message
 * @param options.content - The content of the message
 * @param options.embeds - The embeds of the message
 * @param options.files - The files of the message
 * @returns True if the message was sent successfully, false otherwise
 */
export const sendLongMessageAsync = async (
	channel: TextChannel | VoiceChannel | NewsChannel | ThreadChannel,
	{ content, embeds, files }: MessageCreateOptions
) => {
	const contentChunks = content ? splitIntoChunks(content) : [];

	if (contentChunks.length > 0) {
		for (let i = 0; i < contentChunks.length - 1; i++) {
			await channel.send({
				content: contentChunks[i]
			});
		}

		await channel.send({
			content: contentChunks[contentChunks.length - 1],
			embeds,
			files
		});
		return true;
	} else {
		await channel.send({
			embeds,
			files
		});
		return true;
	}
};

/**
 * Check if a member has the required permissions in a channel
 * @param channel - The channel to check the permissions of
 * @param member - The member to check the permissions of
 * @param requiredPermissions - The required permissions
 * @returns [true, undefined] if the member has the required permissions, [false, permissionNames] if the member does not have the required permissions
 */
export const hasRequiredPermissionsInChannel = async (
	channel: TextChannel | VoiceChannel | NewsChannel | ThreadChannel,
	member: GuildMemberResolvable,
	requiredPermissions: PermissionResolvable[]
) => {
	const memberPermissions = channel.permissionsFor(member);
	if (!memberPermissions) {
		throw new Error('Impossible de vérifier les permissions du membre dans le canal');
	}

	if (requiredPermissions.every((perm) => memberPermissions.has(perm))) return [true, undefined];

	const missingPermissions = requiredPermissions.filter((perm) => !memberPermissions.has(perm));

	const permissionNames = missingPermissions
		.map((perm) => {
			return Object.keys(PermissionFlagsBits).find((key) => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] === perm);
		})
		.join(', ');
	return [false, permissionNames];
};
