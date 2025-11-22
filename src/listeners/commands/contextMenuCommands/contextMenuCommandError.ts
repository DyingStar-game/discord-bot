import { ApplyOptions } from '@sapphire/decorators';
import { type ContextMenuCommandErrorPayload, Events, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.ContextMenuCommandError })
export class ContextMenuCommandErrorListener extends Listener<typeof Events.ContextMenuCommandError> {
	public override async run(error: Error, payload: ContextMenuCommandErrorPayload) {
		await this.container.errorHandler.handleContextMenuCommandError(error, payload);
	}
}
