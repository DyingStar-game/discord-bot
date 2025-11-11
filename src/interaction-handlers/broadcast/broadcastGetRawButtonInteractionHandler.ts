import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';
import { BroadcastVariables, getRawBroadcast } from '../../Services/broadcast.service';

@ApplyOptions<InteractionHandler.Options>({
	name: 'broadcastGetRawButton',
	enabled: true,
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class BroadcastGetRawButtonInteractionHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== BroadcastVariables.ButtonGetRawCustomId) return this.none();
        console.log(interaction.message.components);
		return this.some();
	}
	public override async run(interaction: ButtonInteraction) {
		return await getRawBroadcast(interaction);
	}
}