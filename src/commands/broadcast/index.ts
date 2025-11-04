import { ApplyOptions } from '@sapphire/decorators';
import { Command, container } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplicationIntegrationType, ChannelType, InteractionContextType } from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	name: 'broadcast',
	description: 'Broadcast a message to the server from bot account',
	runIn: ['GUILD_TEXT'],
	aliases: ['broadcast', 'br'],
	typing: true,
	subcommands: [
		{
			name: 'send',
			chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
				return await broadcast(interaction);
			}
		},
		{
			name: 'send2',
			chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
				return await broadcast(interaction);
			}
		},
		{
			name: 'action',
			type: 'group',
			entries: [
				{
					name: 'senvd',
					chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
						return await broadcast(interaction);
					}
				},
				{
					name: 'senvd2',
					chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
						return await broadcast(interaction);
					}
				}
			]
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
						.setDescription('Send a message to the server')
						.addStringOption((option) => option.setName('message-id').setDescription('The message ID to send').setRequired(true))
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel to send the message to')
								.setRequired(true)
								.addChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('send2')
						.setDescription('Send a message to the server')
						.addStringOption((option) => option.setName('message-id').setDescription('The message ID to send').setRequired(true))
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('The channel to send the message to')
								.setRequired(true)
								.addChannelTypes([ChannelType.GuildText, ChannelType.GuildAnnouncement])
						)
				)
				.addSubcommandGroup((group) =>
					group
						.setName('action')
						.setDescription('Action to perform')
						.addSubcommand((subcommand) => subcommand.setName('senvd').setDescription('Send a message to the server'))
						.addSubcommand((subcommand) => subcommand.setName('senvd2').setDescription('Send a message to the server'))
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

const broadcast = async (interaction: Command.ContextMenuCommandInteraction | Command.ChatInputCommandInteraction) => {
	const msg = await interaction.reply({ content: 'Ping?', fetchReply: true });

	const content = `Broadcasted! Bot Latency ${Math.round(container.client.ws.ping)}ms. API Latency ${
		msg.createdTimestamp - interaction.createdTimestamp
	}ms.`;

	return interaction.editReply({ content });
};
