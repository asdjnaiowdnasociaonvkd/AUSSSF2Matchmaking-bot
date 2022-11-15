const { SlashCommandBuilder } = require('discord.js');
//responds with the ruleset

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ruleset')
		.setDescription('ANZ SSF2 Ruleset'),
	async execute(interaction) {
		await interaction.reply("ANZ SSF2 ruleset : https://docs.google.com/document/d/1EfO_iNvyvvjdU8TOsufR_q4O38E_yJHNG-Zer8toLaw/edit");
	},
};