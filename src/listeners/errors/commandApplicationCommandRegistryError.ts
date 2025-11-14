import { ApplyOptions } from '@sapphire/decorators';
import { Command, Events, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.CommandApplicationCommandRegistryError })
export class CommandApplicationCommandRegistryErrorListener extends Listener<typeof Events.CommandApplicationCommandRegistryError> {
	public override async run(error: Error, command: Command) {
		await this.container.errorHandler.handleCommandRegistryError(error, command);
	}
}

