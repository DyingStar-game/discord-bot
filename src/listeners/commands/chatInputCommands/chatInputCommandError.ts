import type { ChatInputCommandErrorPayload, Events } from '@sapphire/framework';
import { Listener, UserError } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';

export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
	public override async run(error: Error, { interaction }: ChatInputCommandErrorPayload) {
		this.container.logger.debug('ChatInputCommandErrorListener');
		const channel = interaction?.channel;

		if (!channel) {
			this.container.logger.error("Impossible de récupérer le canal de l'interaction", error);
			return;
		}

		const errorEmbed = new EmbedBuilder().setColor('#FF0000').setTitle('❌ An unexpected error occurred').setTimestamp();

		if (this.isUserError(error)) errorEmbed.setDescription(error.message);
		else errorEmbed.setDescription('An unexpected error occurred. Please try again later.');

		this.container.logger.error(error);

		try {
			if (interaction.deferred || interaction.replied) await interaction.followUp({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
			else await interaction.reply({ embeds: [errorEmbed], flags: [MessageFlags.Ephemeral] });
		} catch (replyError) {
			this.container.logger.error('Impossible to send the error message:', replyError);
		}
	}

	private isUserError(error: Error): error is UserError {
		return 'identifier' in error;
	}
}
