import { ChatInputCommandInteraction, ContextMenuCommandInteraction } from 'discord.js';

export const sendBroadcast = async (interaction: ChatInputCommandInteraction | ContextMenuCommandInteraction) => {
	await interaction.deferReply({ ephemeral: true });

	const link = interaction.isChatInputCommand() ? interaction.options.getString('link', true) : '';

	// Parse le lien Discord : https://discord.com/channels/{guildId}/{channelId}/{messageId}
	const urlRegex = /^https?:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/;
	const match = link.match(urlRegex);

	if (!match) {
		return interaction.editReply({
			content: 'Lien invalide. Format attendu: https://discord.com/channels/{guildId}/{channelId}/{messageId}'
		});
	}

	const [_, _guildId, channelId, messageId] = match;

	const channel = await interaction.client.channels.fetch(channelId);
	if (!channel || !channel.isTextBased()) {
		return interaction.editReply({ content: 'Channel introuvable ou inaccessible' });
	}

	const message = await channel.messages.fetch(messageId);
	if (!message) {
		return interaction.editReply({ content: 'Message introuvable' });
	}

	const targetChannel = interaction.isChatInputCommand() ? interaction.options.getChannel('channel', true) : interaction.channel;

	if (!targetChannel || !('send' in targetChannel)) {
		return interaction.editReply({ content: 'Channel de destination introuvable' });
	}

	await targetChannel.send({
		content: message.content || undefined,
		embeds: message.embeds,
		files: message.attachments.map((att) => att.url)
	});

	return interaction.editReply({ content: 'Message broadcasté!' });
};
