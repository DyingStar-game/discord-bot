import './lib/setup';

import { container, LogLevel, SapphireClient } from '@sapphire/framework';
import { GatewayIntentBits, Partials } from 'discord.js';
import { ErrorHandler } from './lib/Error/errorHandler';
import { LogHandler } from './lib/logging/logHandler';

const client = new SapphireClient({
	logger: {
		level: LogLevel.Debug
	},
	loadDefaultErrorListeners: false,
	shards: 'auto',
	intents: [
		GatewayIntentBits.DirectMessageReactions,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.GuildExpressions,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessageReactions,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Channel]
});

container.logHandler = new LogHandler(client);
client.logHandler = container.logHandler;

container.errorHandler = new ErrorHandler(client);
client.errorHandler = container.errorHandler;
client.errorHandler.registerProcessListeners();

container.guildId = process.env.GUILD_ID ?? undefined;
if (!container.guildId) {
	throw new Error('GUILD_ID is not set');
}

const main = async () => {
	try {
		client.logger.info('Logging in');
		await client.login();
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

void main();

declare module '@sapphire/pieces' {
	interface Container {
		guildId: string | undefined;
	}
}
