import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events, UserError, type ContextMenuCommandDeniedPayload } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.ContextMenuCommandDenied })
export class ContextMenuCommandDeniedListener extends Listener<typeof Events.ContextMenuCommandDenied> {
	public override async run(error: UserError, payload: ContextMenuCommandDeniedPayload) {
		await this.container.errorHandler.handleContextMenuCommandDenied(error, payload);
	}
}
