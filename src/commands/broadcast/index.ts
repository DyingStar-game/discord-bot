import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplicationIntegrationType, ChannelType, InteractionContextType } from 'discord.js';
import { sendBroadcast } from './sendBroadcast';

@ApplyOptions<Subcommand.Options>({
	name: 'broadcast',
	description: 'Broadcast a message to the server from bot account',
	aliases: ['br'],
	typing: true,
	subcommands: [
		{
			name: 'send',
			chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
				return await sendBroadcast(interaction);
			}
		},
		{
			name: 'get'
			// chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
			// 	return await broadcast(interaction);
			// }
		},
		{
			name: 'update'
			// chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
			// 	return await broadcast(interaction);
			// }
		}
	]
})
export class BroadcastCommand extends Subcommand {
	public override registerApplicationCommands(registry: Command.Registry) {
		const integrationTypes: ApplicationIntegrationType[] = [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall];
		const contexts: InteractionContextType[] = [
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		];

		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setIntegrationTypes(integrationTypes)
				.setContexts(contexts)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('send')
						.setDescription('Broadcast a message to the server with bot account')
						.addStringOption((option) => option.setName('link').setDescription('Link to the message to broadcast').setRequired(true))
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('Channel to broadcast the message to')
								.setRequired(true)
								.addChannelTypes([
									ChannelType.GuildText,
									ChannelType.GuildAnnouncement,
									ChannelType.AnnouncementThread,
									ChannelType.PublicThread,
									ChannelType.PrivateThread,
									ChannelType.GuildForum
								])
						)
				)
		);

		// registry.registerContextMenuCommand({
		// 	name: this.name,
		// 	type: ApplicationCommandType.Message,
		// 	integrationTypes,
		// 	contexts
		// });
	}

	// public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
	// 	return await broadcast(interaction);
	// }
}
