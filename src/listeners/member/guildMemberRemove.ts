import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener } from '@sapphire/framework';
import { cyan, red } from 'colorette';
import { GuildMember } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.GuildMemberRemove })
export class GuildMemberRemoveListener extends Listener {
	public override async run(member: GuildMember) {
		this.container.logger.info(`${red('GuildMemberRemoveListener')} ${member.user.globalName ?? member.user.username}[${cyan(member.user.id)}]`);

		this.container.logHandler.logEvent({
			description: 'Un utilisateur a quitté le serveur',
			user: member.user,
			color: 'Red'
		});
	}
}
