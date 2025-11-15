import { GuildTextBasedChannel } from 'discord.js';

export type logChannel = {
	channelId: string | undefined;
	channel: GuildTextBasedChannel | undefined;
	fetchFailed: boolean;
};
