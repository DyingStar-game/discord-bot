import { Command, container } from '@sapphire/framework';
import { Subcommand } from '@sapphire/plugin-subcommands';

// @ApplyOptions<Subcommand.Options>({
// 	name: 'helloworld',
// 	description: 'Hello World command',
// 	runIn: ['GUILD_TEXT'],
// 	aliases: ['hw'],
// 	typing: true,
// 	subcommands: [
// 		{
// 			name: 'list',
// 			messageRun: 'messageList',
// 			default: true,
// 			chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
// 				return await interactionResponse(interaction);
// 			}
// 		},
// 		{
// 			name: 'action',
// 			type: 'group',
// 			entries: [
// 				{
// 					name: 'add',
// 					messageRun: 'messageAdd',
// 					chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
// 						return await interactionResponse(interaction);
// 					}
// 				},
// 				{
// 					name: 'remove',
// 					messageRun: 'messageRemove',
// 					chatInputRun: async (interaction: Command.ChatInputCommandInteraction) => {
// 						return await interactionResponse(interaction);
// 					}
// 				}
// 			]
// 		}
// 	]
// })
export class UserCommand extends Subcommand {
	public constructor(context: Subcommand.LoaderContext, options: Subcommand.Options) {
		super(context, {
			...options,
			name: 'vip',
			subcommands: [
				{ name: 'list', chatInputRun: 'chatInputList' },
				{
					name: 'action',
					type: 'group',
					entries: [
						{ name: 'add', chatInputRun: 'chatInputAdd' },
						{ name: 'remove', chatInputRun: 'chatInputRemove' }
					]
				}
			]
		});
	}

	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('vip')
				.setDescription('Vip command') // Needed even though base command isn't displayed to end user
				.addSubcommand((command) => command.setName('list').setDescription('List vips'))
				.addSubcommandGroup((group) =>
					group
						.setName('action')
						.setDescription('action subcommand group') // Also needed even though the group isn't displayed to end user
						.addSubcommand((command) =>
							command
								.setName('add')
								.setDescription('Add a vip')
								.addUserOption((option) => option.setName('user').setDescription('user to add to vip list').setRequired(true))
						)
						.addSubcommand((command) =>
							command
								.setName('remove')
								.setDescription('Remove a vip')
								.addUserOption((option) => option.setName('user').setDescription('user to remove from vip list').setRequired(true))
						)
				)
		);
	}

	public async chatInputList(interaction: Subcommand.ChatInputCommandInteraction) {
		return await interactionResponse(interaction);
	}

	public async chatInputAdd(interaction: Subcommand.ChatInputCommandInteraction) {
		return await interactionResponse(interaction);
	}

	public async chatInputRemove(interaction: Subcommand.ChatInputCommandInteraction) {
		return await interactionResponse(interaction);
	}
}

const interactionResponse = async (interaction: Command.ContextMenuCommandInteraction | Command.ChatInputCommandInteraction) => {
	const msg = await interaction.reply({ content: 'Hello World!', fetchReply: true });
	const content = `Hello World! Bot Latency ${Math.round(container.client.ws.ping ?? 0)}ms. API Latency ${
		msg?.createdTimestamp - interaction.createdTimestamp
	}ms.`;
	return interaction.editReply({ content });
};
