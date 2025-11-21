import { ChatInputCommandRunPayload, container, ContextMenuCommandRunPayload, SapphireClient } from '@sapphire/framework';
import { ChatInputSubcommandRunPayload } from '@sapphire/plugin-subcommands';
import { APIEmbedField, ColorResolvable, EmbedBuilder, User } from 'discord.js';
import { buildChannelUrl, resolveLogChannel } from '../../utils/helper/channelHelper';
import { DefaultEmbedBuilder, EmbedColor } from '../../utils/helper/embed.helper';
import { logChannel } from '../../utils/logChannel.type';

type LogCommandPayload = ChatInputCommandRunPayload | ChatInputSubcommandRunPayload | ContextMenuCommandRunPayload;

type LogEventOptions = {
	description: string;
	fields?: APIEmbedField[];
	user: User;
	color?: EmbedColor | ColorResolvable;
};
export class LogHandler {
	private readonly client: SapphireClient;

	public constructor(client: SapphireClient) {
		this.client = client;

		if (!container.logChannel) {
			container.logChannel = {
				channelId: undefined,
				channel: undefined,
				fetchFailed: false
			};
		}
	}
	public async logRunCommand(payload: LogCommandPayload) {
		const userName = `${(payload as any).user.globalName ?? (payload as any).user.username} • (${(payload as any).user.id})`;

		const logEmbed = DefaultEmbedBuilder({
			footer: { text: userName, iconURL: (payload as any).user.displayAvatarURL() }
		})
			.setDescription('Une commande a été exécutée dans un salon')
			.addFields([
				{
					name: 'Salon',
					value: `${buildChannelUrl((payload as any).channelId)}`,
					inline: true
				},
				{
					name: 'Commande',
					value: `\`${(payload as any).command.name}\``,
					inline: true
				}
			]);

		await this.propagate(logEmbed);
	}
	public async logEvent({ description, fields, user, color }: LogEventOptions) {
		const userName = `${user.globalName ?? user.username} • (${user.id})`;

		const logEmbed = DefaultEmbedBuilder({
			footer: { text: userName, iconURL: user.displayAvatarURL() },
			color: color
		})
			.setDescription(description)
			.addFields(fields ?? []);

		await this.propagate(logEmbed);
	}

	private async propagate(embed: EmbedBuilder) {
		const channel = await resolveLogChannel();

		if (!channel) return;

		try {
			await channel.send({ embeds: [embed] });
		} catch (sendError) {
			this.client.logger.error('Impossible de transmettre une erreur dans le salon de log', sendError);
		}
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		logHandler: LogHandler;

		logChannel: logChannel;
	}
}

declare module '@sapphire/framework' {
	interface SapphireClient {
		logHandler: LogHandler;
	}
}
