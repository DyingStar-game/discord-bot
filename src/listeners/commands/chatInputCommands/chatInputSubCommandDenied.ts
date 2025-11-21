import { ApplyOptions } from '@sapphire/decorators';
import { Listener, UserError, type ChatInputCommandDeniedPayload } from '@sapphire/framework';
import { SubcommandPluginEvents } from '@sapphire/plugin-subcommands';

@ApplyOptions<Listener.Options>({ event: SubcommandPluginEvents.ChatInputSubcommandDenied })
export class ChatInputCommandDeniedListener extends Listener {
	public override async run(error: UserError, payload: ChatInputCommandDeniedPayload) {
		await this.container.errorHandler.handleChatInputCommandDenied(error, payload);
	}
}
