import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, type ChannelSelectMenuInteraction } from 'discord.js';
import { BroadcastVariables, getRawBroadcast } from '../../Services/broadcast.service';

@ApplyOptions<InteractionHandler.Options>({
	name: 'broadcastGetRawButton',
	enabled: true,
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class BroadcastGetRawButtonInteractionHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== BroadcastVariables.ButtonGetRawCustomId) return this.none();

		return this.some();
	}
	public override async run(interaction: ChannelSelectMenuInteraction) {
		return await getRawBroadcast(interaction);
	}
}