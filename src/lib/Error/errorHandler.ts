import type {
	AutocompleteInteractionPayload,
	ChatInputCommandDeniedPayload,
	ChatInputCommandErrorPayload,
	ContextMenuCommandDeniedPayload,
	ContextMenuCommandErrorPayload,
	InteractionHandlerError,
	ListenerErrorPayload,
	MessageCommandDeniedPayload,
	MessageCommandErrorPayload
} from '@sapphire/framework';
import { Command, container, Events, SapphireClient, UserError } from '@sapphire/framework';
import { APIEmbedField, BaseInteraction, MessageFlags, type Interaction, type Message, type RepliableInteraction } from 'discord.js';
import { resolveLogChannel } from '../../utils/helper/channelHelper';
import { DefaultEmbedBuilder, EmbedColor } from '../../utils/helper/embed.helper';
import { ServiceException } from './class/serviceException';

interface InteractionContext {
	commandName?: string;
	componentCustomId?: string;
}

interface LogMetadata {
	scope: string;
	commandName?: string;
	componentCustomId?: string;
	interaction?: BaseInteraction;
	extraFields?: APIEmbedField[];
	user?: string;
	guild?: string;
	channel?: string;
}

export class ErrorHandler {
	private readonly client: SapphireClient;

	public constructor(client: SapphireClient) {
		this.client = client;
	}

	public registerProcessListeners() {
		process.removeListener('unhandledRejection', this.onUnhandledRejection);
		process.removeListener('uncaughtException', this.onUncaughtException);

		process.on('unhandledRejection', this.onUnhandledRejection);
		process.on('uncaughtException', this.onUncaughtException);
	}

	public async handleChatInputCommandDenied(error: Error, payload: ChatInputCommandDeniedPayload) {
		const { interaction, command } = payload;

		await this.sendUserFeedback(error, interaction, `Commande slash \`${command?.name ?? 'inconnue'}\``);

		await this.propagate(this.normalizeError(error), {
			scope: Events.ChatInputCommandDenied,
			commandName: command?.name,
			user: this.formatUser(interaction.user),
			guild: interaction.guild?.name,
			channel: interaction.channel?.toString()
		});
	}

	public async handleChatInputCommandError(error: Error, payload: ChatInputCommandErrorPayload) {
		const { interaction, command } = payload;

		await this.sendUserFeedback(error, interaction, `Commande slash \`${command?.name ?? 'inconnue'}\``);

		await this.propagate(this.normalizeError(error), {
			scope: Events.ChatInputCommandError,
			commandName: command?.name,
			user: this.formatUser(interaction.user),
			guild: interaction.guild?.name,
			channel: interaction.channel?.toString()
		});
	}

	public async handleContextMenuCommandDenied(error: Error, payload: ContextMenuCommandDeniedPayload) {
		const { interaction, command } = payload;

		await this.sendUserFeedback(error, interaction as RepliableInteraction, `Commande contextuelle \`${command?.name ?? 'inconnue'}\``);

		await this.propagate(this.normalizeError(error), {
			scope: Events.ContextMenuCommandDenied,
			commandName: command?.name,
			user: this.formatUser(interaction.user),
			guild: interaction.guild?.name,
			channel: interaction.channel?.toString()
		});
	}

	public async handleContextMenuCommandError(error: Error, payload: ContextMenuCommandErrorPayload) {
		const { interaction, command } = payload;

		await this.sendUserFeedback(error, interaction as RepliableInteraction, `Commande contextuelle \`${command?.name ?? 'inconnue'}\``);

		await this.propagate(this.normalizeError(error), {
			scope: Events.ContextMenuCommandError,
			commandName: command?.name,
			user: this.formatUser(interaction.user),
			guild: interaction.guild?.name,
			channel: interaction.channel?.toString()
		});
	}

	public async handleMessageCommandDenied(error: Error, payload: MessageCommandDeniedPayload) {
		const { message, command } = payload;

		await this.sendMessageFeedback(error, message);

		await this.propagate(this.normalizeError(error), {
			scope: Events.MessageCommandDenied,
			commandName: command?.name,
			user: this.formatUser(message.author),
			guild: message.guild?.name,
			channel: message.channel?.toString()
		});
	}

	public async handleMessageCommandError(error: Error, payload: MessageCommandErrorPayload) {
		const { message, command } = payload;

		await this.sendMessageFeedback(error, message);

		await this.propagate(this.normalizeError(error), {
			scope: Events.MessageCommandError,
			commandName: command?.name,
			user: this.formatUser(message.author),
			guild: message.guild?.name,
			channel: message.channel?.toString()
		});
	}

	public async handleInteractionHandlerError(error: Error, payload: InteractionHandlerError) {
		const { interaction, handler } = payload;
		const context: InteractionContext = { componentCustomId: this.extractCustomId(interaction) };

		if (interaction.isRepliable()) {
			await this.sendUserFeedback(error, interaction, `Interaction handler \`${handler.name}\``);
		}

		await this.propagate(this.normalizeError(error), {
			scope: 'InteractionHandlerError',
			commandName: handler.name,
			componentCustomId: context.componentCustomId,
			user: interaction.isRepliable() ? this.formatUser(interaction.user) : undefined,
			guild: interaction.guild?.name,
			channel: interaction.channel?.toString()
		});
	}

	public async handleListenerError(error: Error, payload: ListenerErrorPayload) {
		const { piece } = payload;

		await this.propagate(this.normalizeError(error), {
			scope: 'ListenerError',
			commandName: piece.name,
			extraFields: [
				{
					name: 'Listener',
					value: `\`${piece.name}\` (${String(piece.event)})`,
					inline: false
				},
				{
					name: 'Location',
					value: piece.location.full,
					inline: false
				}
			]
		});
	}

	public async handleAutocompleteError(error: Error, payload: AutocompleteInteractionPayload) {
		const { interaction, command } = payload;

		if (!interaction.responded) {
			try {
				await interaction.respond([]);
			} catch (respondError) {
				this.client.logger.warn('Impossible de répondre à une interaction autocomplete après une erreur', respondError);
			}
		}

		await this.propagate(this.normalizeError(error), {
			scope: 'CommandAutocompleteInteractionError',
			commandName: command.name,
			user: this.formatUser(interaction.user),
			guild: interaction.guild?.name,
			channel: interaction.channel?.toString()
		});
	}

	public async handleCommandRegistryError(error: Error, command: Command) {
		await this.propagate(this.normalizeError(error), {
			scope: 'CommandApplicationCommandRegistryError',
			commandName: command.name
		});
	}

	public async handleGenericError(error: Error, origin = 'ClientError') {
		await this.propagate(this.normalizeError(error), { scope: origin });
	}

	private readonly onUnhandledRejection = (reason: unknown, promise: Promise<unknown>) => {
		void this.handleProcessError('unhandledRejection', reason, { promise });
	};

	private readonly onUncaughtException = (error: Error) => {
		void this.handleProcessError('uncaughtException', error);
	};

	private async handleProcessError(type: 'unhandledRejection' | 'uncaughtException', errorLike: unknown, context: Record<string, unknown> = {}) {
		const error = this.normalizeError(errorLike);
		container.logger.fatal(`[${type}] ${error.message}`, error);

		const extraFields: APIEmbedField[] = Object.entries(context).map(([key, value]) => ({
			name: key,
			value: this.sanitizeFieldValue(value),
			inline: false
		}));

		await this.propagate(error, { scope: type, extraFields });
	}

	private async sendUserFeedback(error: Error, interaction: RepliableInteraction, label: string) {
		if (this.shouldSilence(error)) return;

		const embed = this.buildUserEmbed(error, label, interaction.id);

		try {
			if (interaction.deferred || interaction.replied) {
				await interaction.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral], allowedMentions: { repliedUser: false } });
			} else {
				await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral], allowedMentions: { repliedUser: false } });
			}
		} catch (replyError) {
			this.client.logger.error('Impossible de répondre à une interaction suite à une erreur', replyError);
		}
	}

	private async sendMessageFeedback(error: Error, message: Message) {
		if (this.shouldSilence(error)) return;

		const embed = this.buildUserEmbed(error, `Commande message \`${message.id}\``, message.id);

		try {
			await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
		} catch (sendError) {
			this.client.logger.error('Impossible de notifier un message suite à une erreur', sendError);
		}
	}

	private buildUserEmbed(error: Error, title: string, correlationId: string) {
		const isUserError = this.isUserError(error);
		const description = isUserError ? error.message : "Une erreur inattendue s'est produite. Merci de réessayer plus tard.";

		const embed = DefaultEmbedBuilder({
			color: isUserError ? EmbedColor.WARNING : EmbedColor.ERROR,
			footer: {
				text: `Correlation ID: ${correlationId}`
			}
		})
			.setTitle(`❌ ${title}`)
			.setDescription(this.truncate(description, 4000));

		return embed;
	}

	private buildLogEmbed(error: Error, metadata: LogMetadata) {
		const isUserError = this.isUserError(error);
		const isServiceException = this.isServiceException(error);

		const embed = DefaultEmbedBuilder({
			color: isServiceException ? EmbedColor.ERROR : EmbedColor.WARNING
		})
			.setTitle(`🚨 Erreur : ${metadata.scope}`)
			.setDescription(`\`${this.truncate(error.message, 100)}\``);

		if (metadata.commandName) embed.addFields({ name: 'Commande', value: `\`${metadata.commandName}\`` });
		if (metadata.componentCustomId) embed.addFields({ name: 'Custom ID', value: `\`${this.truncate(metadata.componentCustomId, 100)}\`` });
		if (metadata.user) embed.addFields({ name: 'Utilisateur', value: metadata.user });
		if (metadata.guild) embed.addFields({ name: 'Serveur', value: metadata.guild });
		if (metadata.channel) embed.addFields({ name: 'Salon', value: metadata.channel });
		if (metadata.interaction) embed.addFields({ name: 'Locale', value: metadata.interaction.locale ?? 'inconnue' });
		if (metadata.extraFields?.length) embed.addFields(...metadata.extraFields);

		const identifier = isUserError || isServiceException ? `\`${error.identifier}\`` : null;
		const summary = `${error.name}: ${error.message}`;

		embed.addFields({
			name: identifier ? `Résumé (${identifier})` : 'Résumé',
			value: this.truncate(summary, 1010)
		});

		if (error.stack && isServiceException) {
			embed.addFields({
				name: 'Stack',
				value: `\`\`\`ts\n${this.truncate(error.stack, 200)}\n\`\`\``
			});
		}

		return embed;
	}

	private logError(error: Error, metadata: LogMetadata) {
		const prefix = `[${metadata.scope}]${metadata.commandName ? `(${metadata.commandName})` : ''}`;

		if (this.isUserError(error)) {
			this.client.logger.warn(`${prefix}: ${error.message}`);
			return;
		}

		this.client.logger.error(`${prefix}: ${error.message}`, error);
	}

	private async propagate(error: Error, metadata: LogMetadata) {
		this.logError(error, metadata);

		const embed = this.buildLogEmbed(error, metadata);
		const channel = await resolveLogChannel();

		if (!channel) return;

		try {
			await channel.send({ embeds: [embed] });
		} catch (sendError) {
			this.client.logger.error('Impossible de transmettre une erreur dans le salon de log', sendError);
		}
	}

	private shouldSilence(error: Error): boolean {
		if (!this.isUserError(error)) return false;
		const context = error.context as { silent?: boolean } | undefined;
		return context?.silent === true;
	}

	private isUserError(error: unknown): error is UserError {
		return error instanceof UserError;
	}

	private isServiceException(error: unknown): error is ServiceException {
		return error instanceof ServiceException;
	}

	private extractCustomId(interaction: Interaction) {
		if ('customId' in interaction && typeof interaction.customId === 'string') return interaction.customId;
		return undefined;
	}

	private formatUser(user: { id: string; username?: string; tag?: string }) {
		if ('tag' in user && user.tag) return `${user.tag} (${user.id})`;
		if ('username' in user && user.username) return `${user.username} (${user.id})`;
		return user.id;
	}

	private truncate(text: string, maxLength: number) {
		return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
	}
	private normalizeError(errorLike: unknown): Error {
		if (errorLike instanceof Error) return errorLike;
		if (typeof errorLike === 'string') return new Error(errorLike);

		return new Error(typeof errorLike === 'object' ? JSON.stringify(errorLike, null, 2) : String(errorLike ?? 'Unknown error object'));
	}

	private sanitizeFieldValue(raw: unknown): string {
		if (raw instanceof Promise) return '[object Promise]';
		if (typeof raw === 'undefined') return 'undefined';
		if (raw === null) return 'null';

		const value = typeof raw === 'string' ? raw : JSON.stringify(raw, null, 2);
		return value.length > 1024 ? `${value.slice(0, 1021)}...` : value;
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		errorHandler: ErrorHandler;
	}
}

declare module '@sapphire/framework' {
	interface SapphireClient {
		errorHandler: ErrorHandler;
	}
}
