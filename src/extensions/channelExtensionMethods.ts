import {
	CategoryChannel,
	ForumChannel,
	GuildChannel,
	GuildMember,
	Message,
	MessageCreateOptions,
	MessagePayload,
	NewsChannel,
	PermissionResolvable,
	StageChannel,
	TextChannel,
	ThreadChannel,
	User,
	VoiceChannel
} from 'discord.js';

type TextBasedChannelTypes = Message['channel'];

// Type union de tous les canaux qui supportent les permissions
export type PermissionBasedChannel =
	| GuildChannel
	| TextChannel
	| VoiceChannel
	| CategoryChannel
	| StageChannel
	| ForumChannel
	| NewsChannel
	| ThreadChannel
	| TextBasedChannelTypes;

declare module 'discord.js' {
	interface GuildChannel {
		hasAllPermissions(memberOrUser: GuildMember | User, permissions: PermissionResolvable | PermissionResolvable[]): boolean;
	}

	interface TextChannel {
		hasAllPermissions(memberOrUser: GuildMember | User, permissions: PermissionResolvable | PermissionResolvable[]): boolean;
		sendLongMessageAsync(options: MessageCreateOptions): Promise<boolean>;
	}

	interface VoiceChannel {
		hasAllPermissions(memberOrUser: GuildMember | User, permissions: PermissionResolvable | PermissionResolvable[]): boolean;
	}

	interface CategoryChannel {
		hasAllPermissions(memberOrUser: GuildMember | User, permissions: PermissionResolvable | PermissionResolvable[]): boolean;
	}

	interface StageChannel {
		hasAllPermissions(memberOrUser: GuildMember | User, permissions: PermissionResolvable | PermissionResolvable[]): boolean;
	}

	interface ForumChannel {
		hasAllPermissions(memberOrUser: GuildMember | User, permissions: PermissionResolvable | PermissionResolvable[]): boolean;
	}

	interface NewsChannel {
		hasAllPermissions(memberOrUser: GuildMember | User, permissions: PermissionResolvable | PermissionResolvable[]): boolean;
	}

	interface ThreadChannel {
		hasAllPermissions(memberOrUser: GuildMember | User, permissions: PermissionResolvable | PermissionResolvable[]): boolean;
	}
}

/**
 * Checks if the given member or user has all specified permissions in this channel.
 * @param memberOrUser - The guild member or user whose permissions to check.
 * @param permissions - A permission or array of permissions to check for.
 * @returns True if all permissions are present, false otherwise.
 */
function hasAllPermissions(
	this: PermissionBasedChannel,
	memberOrUser: GuildMember | User,
	permissions: PermissionResolvable | PermissionResolvable[]
): boolean {
	// Vérifier que le canal supporte permissionsFor
	if (!('permissionsFor' in this) || typeof this.permissionsFor !== 'function') {
		return false;
	}

	const perms = this.permissionsFor(memberOrUser);
	if (!perms) return false;

	return perms.has(permissions);
}

function sendLongMessageAsync(this: TextChannel, options: MessageCreateOptions) {
	const content = options.content;
	const contentChunks = content ? content.splitIntoChunks() : [];

	for (const chunk of contentChunks) {
		this.send({ content: chunk });
	}

	return true;
}

// Appliquer la méthode à tous les types de canaux
GuildChannel.prototype.hasAllPermissions = hasAllPermissions;
TextChannel.prototype.hasAllPermissions = hasAllPermissions;
VoiceChannel.prototype.hasAllPermissions = hasAllPermissions;
CategoryChannel.prototype.hasAllPermissions = hasAllPermissions;
StageChannel.prototype.hasAllPermissions = hasAllPermissions;
ForumChannel.prototype.hasAllPermissions = hasAllPermissions;
NewsChannel.prototype.hasAllPermissions = hasAllPermissions;
ThreadChannel.prototype.hasAllPermissions = hasAllPermissions;
