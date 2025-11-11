import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplicationCommandType, ApplicationIntegrationType, ContextMenuCommandInteraction, InteractionContextType, MessageFlags } from 'discord.js';
import { broadcastContainerBuilder, getRawBroadcast, sendBroadcast, sendSelectChannelTypes } from '../../Services/broadcast.service';
import '../../utils/methods/channelMethods';
import '../../utils/methods/stringMethods';

@ApplyOptions<Subcommand.Options>({
	name: 'broadcast',
	description: 'Broadcast a message to the server from bot account',
	aliases: ['br'],
	typing: true,
	preconditions: [['LeadOrStaff']], //[['Precondition1', 'Precondition2']] = OR | ['Precondition1', 'Precondition2'] = AND
	subcommands: [
		{
			name: 'send',
			chatInputRun: sendBroadcast
		},
		{
			name: 'getraw',
			chatInputRun: getRawBroadcast
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
								.addChannelTypes(sendSelectChannelTypes)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('getraw')
						.setDescription('Get a target message and send raw content to dump channel')
						.addStringOption((option) => option.setName('link').setDescription('Message\'s link to retrieve').setRequired(true))
				)
		);

		registry.registerContextMenuCommand({
			name: this.name,
			type: ApplicationCommandType.Message,
			integrationTypes,
			contexts
		});
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

		const broadcastContainer = broadcastContainerBuilder(interaction.channelId, interaction.targetId);

		return interaction.editReply({
			components: [broadcastContainer],
			flags: [MessageFlags.IsComponentsV2]
		});
	}
}
