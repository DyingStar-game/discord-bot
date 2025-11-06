import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { ApplicationIntegrationType, ChannelType, ChatInputCommandInteraction, ContextMenuCommandInteraction, InteractionContextType, PermissionFlagsBits, TextChannel } from 'discord.js';
// import { sendBroadcast } from './sendBroadcast';

@ApplyOptions<Subcommand.Options>({
	name: 'broadcast',
	description: 'Broadcast a message to the server from bot account',
	aliases: ['br'],
	typing: true,
	preconditions: ['LeadOnly'], //[['Precondition1', 'Precondition2']] = OR | ['Precondition1', 'Precondition2'] = AND
	subcommands: [
		{
			name: 'send',
			chatInputRun: 'sendBroadcast'
		},
		{
			name: 'get'
			// chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
			// 	return await broadcast(interaction);
			// }
		},
		{
			name: 'update'
			// chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
			// 	return await broadcast(interaction);
			// }
		}
	]
})
export class BroadcastCommand extends Subcommand {
	public override registerApplicationCommands(registry: Command.Registry) {
		const integrationTypes: ApplicationIntegrationType[] = [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall];
		const contexts: InteractionContextType[] = [
			InteractionContextType.BotDM,
			InteractionContextType.Guild,
			InteractionContextType.PrivateChannel
		];

		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setIntegrationTypes(integrationTypes)
				.setContexts(contexts)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('send')
						.setDescription('Broadcast a message to the server with bot account')
						.addStringOption((option) => option.setName('link').setDescription('Link to the message to broadcast').setRequired(true))
						.addChannelOption((option) =>
							option
								.setName('channel')
								.setDescription('Channel to broadcast the message to')
								.setRequired(true)
								.addChannelTypes([
									ChannelType.GuildText,
									ChannelType.GuildAnnouncement,
									ChannelType.AnnouncementThread,
									ChannelType.PublicThread,
									ChannelType.PrivateThread
								])
						)
				)
		);

		// registry.registerContextMenuCommand({
		// 	name: this.name,
		// 	type: ApplicationCommandType.Message,
		// 	integrationTypes,
		// 	contexts
		// });
	}

	// public override async contextMenuRun(interaction: Command.ContextMenuCommandInteraction) {
	// 	return await broadcast(interaction);
	// }

	public sendBroadcast = async (interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction) => {
	await interaction.deferReply({ ephemeral: true });

	const link = interaction.isChatInputCommand() ? interaction.options.getString('link', true) : '';

	// Parse Discord link: https://discord.com/channels/{guildId}/{channelId}/{messageId}
	const urlRegex = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
	const match = link.match(urlRegex);

	if (!match) {
		return interaction.editReply({
			content: '❌ Lien invalide. Format attendu: https://discord.com/channels/{guildId}/{channelId}/{messageId}'
		});
	}

	const [_, _guildId, channelId, messageId] = match;

	// Fetch source channel
	const channel = await interaction.client.channels.fetch(channelId);
	if (!channel || !channel.isTextBased()) {
		return interaction.editReply({ content: '❌ Channel introuvable ou inaccessible '});
	}

	// Fetch source message
	const message = await channel.messages.fetch(messageId);
	if (!message) {
		return interaction.editReply({ content: '❌ Message introuvable' });
	}

	// Get target channel
	const targetChannel = interaction.isChatInputCommand() 
		? interaction.options.getChannel('channel', true) 
		: interaction.channel;

	if (!targetChannel || !('send' in targetChannel)) {
		return interaction.editReply({ content: '❌ Channel de destination introuvable' });
	}

	// Cast to TextChannel to access permissions
	const textChannel = targetChannel as TextChannel;

	// Check if user has permissions to send messages in target channel
	if (interaction.guild && interaction.member) {
		
		// Fetch the full GuildMember object if needed
		const member = await interaction.guild.members.fetch(interaction.user.id);
		const memberPermissions = textChannel.permissionsFor(member);
		
		if (!memberPermissions) {
			return interaction.editReply({ content: '❌ Impossible de vérifier vos permissions sur ce channel' });
		}

		// Check required permissions
		const requiredPermissions = [
			PermissionFlagsBits.ViewChannel,
			PermissionFlagsBits.SendMessages
		];

		// If message contains embeds
		if (message.embeds.length > 0) {
			requiredPermissions.push(PermissionFlagsBits.EmbedLinks);
		}

		// If message contains files
		if (message.attachments.size > 0) {
			requiredPermissions.push(PermissionFlagsBits.AttachFiles);
		}

		const missingPermissions = requiredPermissions.filter(perm => !memberPermissions.has(perm));

		if (missingPermissions.length > 0) {
			const permissionNames = missingPermissions.map(perm => {
				return Object.keys(PermissionFlagsBits).find(
					key => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] === perm
				);
			}).join(', ');

			return interaction.editReply({ 
				content: `❌ Vous n'avez pas les permissions nécessaires sur ce channel.\nPermissions manquantes: ${permissionNames}` 
			});
		}
	}

	// Check if bot has permissions to send messages in target channel
	const botPermissions = textChannel.permissionsFor(interaction.client.user!);
	
	if (!botPermissions) {
		return interaction.editReply({ content: '❌ Le bot ne peut pas accéder à ce channel' });
	}

	const botRequiredPermissions = [
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.SendMessages
	];

	if (message.embeds.length > 0) {
		botRequiredPermissions.push(PermissionFlagsBits.EmbedLinks);
	}

	if (message.attachments.size > 0) {
		botRequiredPermissions.push(PermissionFlagsBits.AttachFiles);
	}

	const botMissingPermissions = botRequiredPermissions.filter(perm => !botPermissions.has(perm));

	if (botMissingPermissions.length > 0) {
		const permissionNames = botMissingPermissions.map(perm => {
			return Object.keys(PermissionFlagsBits).find(
				key => PermissionFlagsBits[key as keyof typeof PermissionFlagsBits] === perm
			);
		}).join(', ');

		return interaction.editReply({ 
			content: `❌ Le bot n'a pas les permissions nécessaires sur ce channel.\nPermissions manquantes: ${permissionNames}` 
		});
	}

	// Function to split message into chunks of 2000 characters maximum
	// while respecting line breaks
	const splitMessage = (text: string, maxLength: number = 2000): string[] => {
		if (text.length <= maxLength) return [text];

		const chunks: string[] = [];
		const lines = text.split('\n');
		let currentChunk = '';

		for (const line of lines) {
			// If a single line exceeds the limit, cut it (rare case)
			if (line.length > maxLength) {
				// Save current chunk if it exists
				if (currentChunk) {
					chunks.push(currentChunk);
					currentChunk = '';
				}

				// Cut the too long line by words
				const words = line.split(' ');
				let longLineChunk = '';

				for (const word of words) {
					if ((longLineChunk + word + ' ').length > maxLength) {
						if (longLineChunk) {
							chunks.push(longLineChunk.trim());
							longLineChunk = word + ' ';
						} else {
							// Word alone exceeds limit, cut it brutally
							chunks.push(word.substring(0, maxLength));
							longLineChunk = word.substring(maxLength) + ' ';
						}
					} else {
						longLineChunk += word + ' ';
					}
				}

				if (longLineChunk) {
					currentChunk = longLineChunk.trim() + '\n';
				}
				continue;
			}

			// Check if adding this line exceeds the limit
			if ((currentChunk + line + '\n').length > maxLength) {
				// Save current chunk and start a new one
				chunks.push(currentChunk.trim());
				currentChunk = line + '\n';
			} else {
				currentChunk += line + '\n';
			}
		}

		// Add last chunk if it exists
		if (currentChunk) {
			chunks.push(currentChunk.trim());
		}

		return chunks;
	};

	// Split content if necessary
	const content = message.content || '';
	const contentChunks = content ? splitMessage(content) : [];

	// Send message(s)
	try {
		// First message with embeds and files
		if (contentChunks.length > 0) {
			await textChannel.send({
				content: contentChunks[0],
				embeds: message.embeds,
				files: message.attachments.map((att) => att.url)
			});

			// Following messages (only content)
			for (let i = 1; i < contentChunks.length; i++) {
				await textChannel.send({
					content: contentChunks[i]
				});
			}

			const messageCount = contentChunks.length;
			return interaction.editReply({ 
				content: `✅ Message broadcasté avec succès!${messageCount > 1 ? ` (divisé en ${messageCount} parties)` : ''}` 
			});
		} else {
			// Case where there are only embeds/files without text content
			await textChannel.send({
				embeds: message.embeds,
				files: message.attachments.map((att) => att.url)
			});

			return interaction.editReply({ content: '✅ Message broadcasté avec succès!' });
		}
	} catch (error) {
		console.error('Erreur lors du broadcast:', error);
		return interaction.editReply({ 
			content: '❌ Erreur lors de l\'envoi du message. Vérifiez les permissions du bot.' 
		});
	}
};
}


