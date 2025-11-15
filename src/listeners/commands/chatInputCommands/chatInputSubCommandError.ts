import { ApplyOptions } from '@sapphire/decorators';
import { Listener, type ChatInputCommandErrorPayload } from '@sapphire/framework';
import { SubcommandPluginEvents } from '@sapphire/plugin-subcommands';

@ApplyOptions<Listener.Options>({ event: SubcommandPluginEvents.ChatInputSubcommandError })
export class ChatInputCommandError extends Listener {
	public override async run(error: Error, payload: ChatInputCommandErrorPayload) {
		await this.container.errorHandler.handleChatInputCommandError(error, payload);
	}
}
