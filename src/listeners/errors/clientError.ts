import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({ event: Events.Error })
export class ClientErrorListener extends Listener<typeof Events.Error> {
	public override async run(error: Error) {
		await this.container.errorHandler.handleGenericError(error);
	}
}
