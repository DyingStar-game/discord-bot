import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { Roles } from '../config/Roles';

export class LeadOnlyPrecondition extends Precondition {
	private readonly requiredRoles = [...Roles.Groups.LEADERSHIP, Roles.ADMIN];

	public override async messageRun(message: Message) {
		return this.checkRole(message.member);
	}

	public override async chatInputRun(interaction: CommandInteraction) {
		return this.checkRole(interaction.member);
	}

	public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
		return this.checkRole(interaction.member);
	}

	private checkRole(member: any) {
		// Check if member is realy a GuildMember
		if (!member || !member.roles) {
			return this.error({ message: '❌ Cette commande ne peut être utilisée que dans un serveur.' });
		}

		// Check if memer has only one required role
		if (Roles.hasAnyRole(member.roles.cache, this.requiredRoles)) {
			return this.ok();
		}

		return this.error({ message: "❌ Vous n'avez pas le rôle requis pour utiliser cette commande." });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		LeadOnly: never;
	}
}
