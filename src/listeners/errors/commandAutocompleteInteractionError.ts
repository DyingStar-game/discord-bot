import { ApplyOptions } from '@sapphire/decorators';
import { AutocompleteInteractionPayload, Events, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.CommandAutocompleteInteractionError })
export class CommandAutocompleteInteractionErrorListener extends Listener<typeof Events.CommandAutocompleteInteractionError> {
	public override async run(error: Error, payload: AutocompleteInteractionPayload) {
		await this.container.errorHandler.handleAutocompleteError(error, payload);
	}
}
