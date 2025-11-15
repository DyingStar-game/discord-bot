import { UserError } from '@sapphire/framework';

export class ServiceException extends Error {
	public readonly identifier: string;
	public readonly context: unknown;

	constructor(options: UserError.Options) {
		super(options.message);
		this.identifier = options.identifier;
		this.context = options.context;
		Object.setPrototypeOf(this, ServiceException.prototype);
	}
}
