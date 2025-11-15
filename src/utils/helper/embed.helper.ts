import { ColorResolvable, EmbedBuilder } from 'discord.js';
type EmbedOptions = {
	thumbnail?: boolean;
	color?: EmbedColor | ColorResolvable;
	author?: {
		name?: string;
		iconURL?: string;
		url?: string;
	};
	footer?: {
		text?: string;
		iconURL?: string;
	};
};

export enum EmbedColor {
	DEFAULT = 0xff8000,
	ERROR = 0xe74c3c,
	SUCCESS = 0x00ff00,
	WARNING = 0xf1c40f,
	INFO = 0x0000ff
}

export const DefaultEmbedBuilder = ({ color = EmbedColor.DEFAULT, thumbnail = true, author, footer }: EmbedOptions = {}) => {
	const defaultName = require('../../../package.json').name;

	const embed = new EmbedBuilder()
		.setAuthor({
			name: author?.name ?? defaultName,
			iconURL: author?.iconURL ?? 'https://i.imgur.com/3btFKPl.png',
			url: author?.url ?? 'https://discord.gg/VCSzdY9QKN'
		})
		.setColor(color)
		.setFooter({
			text: footer?.text ?? defaultName,
			iconURL: footer?.iconURL ?? 'https://i.imgur.com/3btFKPl.png'
		})
		.setTimestamp()
		.addFields();

	if (thumbnail) embed.setThumbnail('https://i.imgur.com/Jx2VbR2.png');

	return embed;
};
