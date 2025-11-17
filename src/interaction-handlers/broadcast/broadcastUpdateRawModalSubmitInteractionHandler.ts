import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ModalSubmitInteraction } from 'discord.js';
import { BroadcastVariables, updateRawBroadcast } from '../../Services/broadcast.service';

@ApplyOptions<InteractionHandler.Options>({
	name: 'broadcastUpdateRawModal',
	enabled: true,
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class BroadcastUpdateRawModalInteractionHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction) {
		// Check if custom ID starts with the modal ID (because we append the message ID)
		if (!interaction.customId.startsWith(BroadcastVariables.ModalUpdateRawId)) return this.none();
		return this.some();
	}
	
	public override async run(interaction: ModalSubmitInteraction) {
		return await updateRawBroadcast(interaction);
	}
}