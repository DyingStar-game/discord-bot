// src/preconditions/LeadOrStaff.ts
import { Precondition } from '@sapphire/framework';
import type { CommandInteraction, ContextMenuCommandInteraction, Message } from 'discord.js';
import { Roles } from '../config/Roles';

export class LeadOrStaffPrecondition extends Precondition {
	private readonly requiredRoles = [...Roles.Groups.LEADERSHIP, ...Roles.Groups.STAFF, Roles.ADMIN];

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
		if (!member || !member.roles) {
			return this.error({ message: '❌ This command can only be used in a server.' });
		}

		if (Roles.hasAnyRole(member.roles.cache, this.requiredRoles)) {
			return this.ok();
		}

		return this.error({ message: "❌ You don't have the required role to use this command." });
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		LeadOrStaff: never;
	}
}
