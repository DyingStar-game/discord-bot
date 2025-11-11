import { isTextBasedChannel } from '@sapphire/discord.js-utilities';
import { container } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import {
	ActionRowBuilder,
	ApplicationCommandOptionAllowedChannelTypes,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelSelectMenuBuilder,
	ChannelSelectMenuInteraction,
	ChannelType,
	ChatInputCommandInteraction,
	ContainerBuilder,
	escapeMarkdown,
	MessageActionRowComponentBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextChannel,
	TextDisplayBuilder
} from 'discord.js';
import { sendLongMessageAsync } from '../utils/methods/channelMethods';
import { buildRawMessage, interactionRespond, verifyMessage } from '../utils/methods/messageMethods';
import { Roles } from '../utils/roles';

export type BroadcastInteraction = ChatInputCommandInteraction | ChannelSelectMenuInteraction;

export const sendSelectChannelTypes: ApplicationCommandOptionAllowedChannelTypes[] = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
	ChannelType.AnnouncementThread,
	ChannelType.PublicThread,
	ChannelType.PrivateThread
];

export enum BroadcastVariables {
	ChannelSelectCustomId = 'broadcastSendChannelSelect',
	ButtonGetRawCustomId = 'broadcastGetRawButton',
	LinkTextDisplayOptionId = 636074777,
	ContainerId = 72184951
}

export const broadcastContainerBuilder = (channelId: string, messageId: string) =>
	new ContainerBuilder()
		.setAccentColor(15844367)
		.setId(BroadcastVariables.ContainerId)
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('Choice the action to perform on this message :'))
		.addTextDisplayComponents(
			new TextDisplayBuilder()
				.setContent(`https://discord.com/channels/${envParseString('GUILD_ID')}/${channelId}/${messageId}`)
				.setId(BroadcastVariables.LinkTextDisplayOptionId)
		)
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Send\nSend the message to a specific channel :'))
		.addActionRowComponents(
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ChannelSelectMenuBuilder()
					.setCustomId(`${BroadcastVariables.ChannelSelectCustomId}`)
					.setPlaceholder('Select the channel to send the message to')
					.addChannelTypes(sendSelectChannelTypes)
			)
		)
		.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent('# Get Raw\nSend raw content of the message to dump channel :'))
		.addActionRowComponents(
			new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				new ButtonBuilder()
				.setCustomId(`${BroadcastVariables.ButtonGetRawCustomId}`)
				.setLabel("Get Raw")
				.setStyle(ButtonStyle.Primary)
			)
		);

// BROADCAST SEND
export const sendBroadcast = async (interaction: BroadcastInteraction) => {
	
	const message = await verifyMessage(interaction, false, false);

	// Get target channel
	let broadcastChannel = interaction.isChatInputCommand() ? interaction.options.getChannel('channel', true) : interaction.channel;

	if (interaction instanceof ChannelSelectMenuInteraction) {
		const targetChannel = container.client.channels.cache.get(interaction.values[0]);
		if (!targetChannel || !sendSelectChannelTypes.includes(targetChannel?.type as ApplicationCommandOptionAllowedChannelTypes)) {
			return interactionRespond(interaction, '❌ Impossible de broadcast le message vers le canal sélectionné');
		}
		broadcastChannel = targetChannel;
	}

	if (!broadcastChannel || !('send' in broadcastChannel) || !('permissionsFor' in broadcastChannel) || !isTextBasedChannel(broadcastChannel)) {
		return interactionRespond(interaction, '❌ Channel de destination introuvable ou inaccessible');
	}

	try {
		await sendLongMessageAsync(broadcastChannel, {
			content: message.content,
			embeds: message.embeds,
			files: message.attachments.map((att) => att.url)
		});
		return interactionRespond(interaction, '✅ Message broadcasté avec succès!');
	} catch (error) {
		container.logger.error('Erreur lors du broadcast:', error);
		return interactionRespond(interaction, "❌ Erreur lors de l'envoi du message. Vérifiez les permissions du bot.");
	}
};

// BROADCAST GET RAW
export const getRawBroadcast = async (interaction: BroadcastInteraction) => {

	const message = await verifyMessage(interaction, true, true);
	
	try {
		// Récupérer le canal Dump
		const dumpChannel = await container.client.channels.fetch(Roles.DUMP);
		if (!dumpChannel || !dumpChannel.isTextBased()) {
			return interactionRespond(interaction, '❌ Canal Dump introuvable ou inaccessible');
		}

		// Construire le contenu raw
		const rawContent = buildRawMessage(message);

		// Vérifier si le contenu dépasse 2000 caractères
		if (rawContent.length > 2000) {
			// Envoyer en fichier .txt
			const attachment = new AttachmentBuilder(Buffer.from(rawContent, 'utf-8'), {
				name: `raw-message-${message.id}.txt`
			});

			await (dumpChannel as TextChannel).send({
				content: `**Raw message from ${escapeMarkdown(message.author.tag)}** (<@${message.author.id}>)\n**Original:** ${message.url}`,
				files: [attachment]
			});
		} else {
			// Envoyer directement
			await (dumpChannel as TextChannel).send({
				content: `**Raw message from ${escapeMarkdown(message.author.tag)}** (<@${message.author.id}>)\n**Original:** ${message.url}\n\n${rawContent}`
			});
		}

		return interactionRespond(interaction, '✅ Message raw envoyé dans le canal Dump avec succès!');
	} catch (error) {
		container.logger.error('Erreur lors du getRaw:', error);
		return interactionRespond(interaction, "❌ Erreur lors de l'envoi du message raw. Vérifiez les permissions du bot.");
	}

};
