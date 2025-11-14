import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events, UserError, type MessageCommandDeniedPayload } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.MessageCommandDenied })
export class MessageCommandDeniedListener extends Listener<typeof Events.MessageCommandDenied> {
	public override async run(error: UserError, payload: MessageCommandDeniedPayload) {
		await this.container.errorHandler.handleMessageCommandDenied(error, payload);
	}
}
