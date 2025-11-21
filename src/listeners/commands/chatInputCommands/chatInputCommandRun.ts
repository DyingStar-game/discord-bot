import { ApplyOptions } from '@sapphire/decorators';
import { ChatInputCommandRunPayload, Events, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.ChatInputCommandRun })
export class ChatInputCommandRun extends Listener {
	public override async run(payload: ChatInputCommandRunPayload) {
		this.container.logHandler.logRunCommand(payload);
	}
}
