import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction } from 'discord.js';
import { BroadcastVariables, updateRawBroadcastModal } from '../../Services/broadcast.service';

@ApplyOptions<InteractionHandler.Options>({
	name: 'broadcastUpdateRawButton',
	enabled: true,
	interactionHandlerType: InteractionHandlerTypes.Button
})
export class BroadcastUpdateRawButtonInteractionHandler extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		if (interaction.customId !== BroadcastVariables.ButtonUpdateRawCustomId) return this.none();
        
		return this.some();
	}
	public override async run(interaction: ButtonInteraction) {
		return await updateRawBroadcastModal(interaction);
	}
}