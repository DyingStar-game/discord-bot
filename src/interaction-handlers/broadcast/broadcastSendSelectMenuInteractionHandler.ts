import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { type ChannelSelectMenuInteraction } from 'discord.js';
import { BroadcastVariables, sendBroadcast } from '../../Services/broadcast.service';

@ApplyOptions<InteractionHandler.Options>({
	name: 'broadcastSendChannelSelect',
	enabled: true,
	interactionHandlerType: InteractionHandlerTypes.SelectMenu
})
export class BroadcastSendSelectMenuInteractionHandler extends InteractionHandler {
	public override parse(interaction: ChannelSelectMenuInteraction) {
		if (interaction.customId !== BroadcastVariables.ChannelSelectCustomId) return this.none();

		return this.some();
	}
	public override async run(interaction: ChannelSelectMenuInteraction) {
		return await sendBroadcast(interaction);
	}
}
