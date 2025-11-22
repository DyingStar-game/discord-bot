import { ApplyOptions } from '@sapphire/decorators';
import type { ListenerErrorPayload } from '@sapphire/framework';
import { Events, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.ListenerError })
export class ListenerErrorListener extends Listener<typeof Events.ListenerError> {
	public override async run(error: Error, payload: ListenerErrorPayload) {
		const normalized = error instanceof Error ? error : new Error(String(error));
		await this.container.errorHandler.handleListenerError(normalized, payload);
	}
}
