import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events, UserError, type ChatInputCommandDeniedPayload } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.ChatInputCommandDenied })
export class ChatInputCommandDeniedListener extends Listener<typeof Events.ChatInputCommandDenied> {
	public override async run(error: UserError, payload: ChatInputCommandDeniedPayload) {
		await this.container.errorHandler.handleChatInputCommandDenied(error, payload);
	}
}
