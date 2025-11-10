import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type MessageCommandErrorPayload } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.MessageCommandError })
export class MessageCommandErrorListener extends Listener<typeof Events.MessageCommandError> {
	public override async run(error: Error, payload: MessageCommandErrorPayload) {
		await this.container.errorHandler.handleMessageCommandError(error, payload);
	}
}
