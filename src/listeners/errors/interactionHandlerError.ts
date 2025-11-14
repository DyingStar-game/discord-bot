import { ApplyOptions } from '@sapphire/decorators';
import type { Events, InteractionHandlerError } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.InteractionHandlerError })
export class InteractionHandlerErrorListener extends Listener<typeof Events.InteractionHandlerError> {
	public override async run(error: Error, payload: InteractionHandlerError) {
		await this.container.errorHandler.handleInteractionHandlerError(error, payload);
	}
}

