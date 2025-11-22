import { ApplyOptions } from '@sapphire/decorators';
import { ContextMenuCommandRunPayload, Events, Listener, LogLevel } from '@sapphire/framework';
import type { Logger } from '@sapphire/plugin-logger';

@ApplyOptions<Listener.Options>({ event: Events.ContextMenuCommandRun })
export class ContextMenuCommandRunListener extends Listener {
	public override run(payload: ContextMenuCommandRunPayload) {
		this.container.logHandler.logRunCommand(payload);
	}

	public override onLoad() {
		this.enabled = (this.container.logger as Logger).level <= LogLevel.Debug;
		return super.onLoad();
	}
}
