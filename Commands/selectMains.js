const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mains')
		.setDescription('Choose your mains'),
	async execute(interaction) {
		await interaction.reply("");
	},
};