import { ApplyOptions } from '@sapphire/decorators';
import { isTextBasedChannel } from '@sapphire/discord.js-utilities';
import { Command } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';
import {
	ApplicationIntegrationType,
	ChannelType,
	ChatInputCommandInteraction,
	ContextMenuCommandInteraction,
	GuildMember,
	InteractionContextType,
	PermissionFlagsBits
} from 'discord.js';
import '../../utils/channelMethods';
import { hasRequiredPermissionsInChannel, sendLongMessageAsync } from '../../utils/channelMethods';
import { isBotMessage, isMessageOwner } from '../../utils/messageMethods';
import '../../utils/stringMethods';

@ApplyOptions<Subcommand.Options>({
	name: 'broadcast',
	description: 'Broadcast a message to the server from bot account',
	aliases: ['br'],
	typing: true,
	preconditions: [['LeadOrStaff']], //[['Precondition1', 'Precondition2']] = OR | ['Precondition1', 'Precondition2'] = AND
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

		const interactionMember =
			interaction.member instanceof GuildMember ? interaction.member : await interaction.guild?.members.fetch(interaction.user.id);
		if (!interactionMember) {
			return interaction.editReply({
				content: '❌ Member not found'
			});
		}

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
			return interaction.editReply({ content: '❌ Channel introuvable ou inaccessible ' });
		}

		// Fetch source message
		const message = await channel.messages.fetch(messageId);
		if (!message) {
			return interaction.editReply({ content: '❌ Message introuvable' });
		}

		if (isBotMessage(message)) {
			return interaction.editReply({ content: '❌ Vous ne pouvez pas broadcast un message du bot' });
		}

		if (!isMessageOwner(message, interactionMember))
			return interaction.editReply({ content: "❌ Vous ne pouvez pas broadcast un message qui n'est pas votre" });

		// Get target channel
		const broadcastChannel = interaction.isChatInputCommand() ? interaction.options.getChannel('channel', true) : interaction.channel;

		if (!broadcastChannel || !('send' in broadcastChannel) || !('permissionsFor' in broadcastChannel) || !isTextBasedChannel(broadcastChannel)) {
			return interaction.editReply({ content: '❌ Channel de destination introuvable ou inaccessible' });
		}

		const requiredPermissions = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages];
		if (message.embeds.length > 0) requiredPermissions.push(PermissionFlagsBits.EmbedLinks);
		if (message.attachments.size > 0) requiredPermissions.push(PermissionFlagsBits.AttachFiles);

		const [canSendMessages, canSendMessagesPermissionNames] = await hasRequiredPermissionsInChannel(
			broadcastChannel,
			interactionMember,
			requiredPermissions
		);
		if (!canSendMessages)
			return interaction.editReply({
				content: `❌ Vous n'avez pas les permissions nécessaires sur ce channel.\nPermissions manquantes: ${canSendMessagesPermissionNames}`
			});

		try {
			await sendLongMessageAsync(broadcastChannel, {
				content: message.content,
				embeds: message.embeds,
				files: message.attachments.map((att) => att.url)
			});
			return interaction.editReply({ content: '✅ Message broadcasté avec succès!' });
		} catch (error) {
			console.error('Erreur lors du broadcast:', error);
			return interaction.editReply({
				content: "❌ Erreur lors de l'envoi du message. Vérifiez les permissions du bot."
			});
		}
	};
}
