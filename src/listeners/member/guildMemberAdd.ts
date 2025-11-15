import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { cyan, green } from 'colorette';
import { GuildMember } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberAdd })
export class GuildMemberAddListener extends Listener {
	public override async run(member: GuildMember) {
		this.container.logger.info(`${green('GuildMemberAddListener')} ${member.user.globalName ?? member.user.username}[${cyan(member.user.id)}]`);

		this.container.logHandler.logEvent({
			description: 'Un utilisateur a rejoint le serveur',
			user: member.user,
			color: 'Green'
		});
	}
}
