import { ApplyOptions } from '@sapphire/decorators';
import type { AutocompleteInteractionPayload, Events } from '@sapphire/framework';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({})
export class CommandAutocompleteInteractionErrorListener extends Listener<typeof Events.CommandAutocompleteInteractionError> {
	public override async run(error: Error, payload: AutocompleteInteractionPayload) {
		await this.container.errorHandler.handleAutocompleteError(error, payload);
	}
}

