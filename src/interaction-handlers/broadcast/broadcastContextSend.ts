import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { MessageFlags } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	name: 'broadcastContextSend',
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class BroadcastContextSendHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== 'broadcast-send') return this.none();

		return this.some();
	}

	public async run(interaction: ButtonInteraction) {
		await interaction.reply({
			content: 'Hello from a button interaction handler!',
			// Let's make it so only the person who pressed the button can see this message!
			flags: MessageFlags.Ephemeral
		});
	}
}
