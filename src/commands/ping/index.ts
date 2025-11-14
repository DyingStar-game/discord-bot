import { ApplyOptions } from '@sapphire/decorators';
import { Command, UserError } from '@sapphire/framework';
import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'ping',
	typing: true,
	description: 'ping pong'
})
export class PingCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		const integrationTypes: ApplicationIntegrationType[] = [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall];
		const contexts: InteractionContextType[] = [
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		];

		registry.registerChatInputCommand({
			name: this.name,
			description: this.description,
			integrationTypes,
			contexts
		});

		registry.registerContextMenuCommand({
			name: this.name,
			type: ApplicationCommandType.Message,
			integrationTypes,
			contexts
		});
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
		throw new UserError({ identifier: 'ping_error', message: 'Ping error', context: { silent: true, interaction, command: this } });
	}

	public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
		throw new UserError({ identifier: 'ping_error', message: 'Ping error', context: { silent: true, interaction, command: this } });
	}
}
