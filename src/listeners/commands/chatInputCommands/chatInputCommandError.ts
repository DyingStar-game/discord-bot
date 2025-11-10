import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events, type ChatInputCommandErrorPayload } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.ChatInputCommandError })
export class ChatInputCommandError extends Listener<typeof Events.ChatInputCommandError> {
	public override async run(error: Error, payload: ChatInputCommandErrorPayload) {
		await this.container.errorHandler.handleChatInputCommandError(error, payload);
	}
}