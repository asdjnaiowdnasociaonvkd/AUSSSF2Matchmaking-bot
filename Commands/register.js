const { SlashCommandBuilder } = require('discord.js');
const sheetsDataProcessing = require('./../sheetsDataProcessing.js')
//profile registration

module.exports = {
	data: new SlashCommandBuilder()
		.setName('register')
		.setDescription('Register your username here')
		.addStringOption(option =>
			option.setName('username')
				.setDescription('Your username')
				.setRequired(true)
	),
	async execute(interaction) {
		var isReg = false
		var id = interaction.user.id

		//checks if player is registered
		for (players in sheetsDataProcessing.playerData) {
			if (sheetsDataProcessing.playerData[players].playerID == id) {
				isReg = true
			}

		}

		if (isReg == true) {
			interaction.reply("You are already registered!")
		} else {
			sheetsDataProcessing.playerData.push({
				"playerID": interaction.user.id,
				"playerUsername": interaction.options.getString("username"),
				"playerRating": "1200",
				"playerDev": "350",
				"playerVol": "0.6",
				"playerWins": 0,
				"playerLosses": 0,
				"playerMains": null,
				"playerSecondaries": null,
				"playerPocket": null,
				"playerMax": "1200"
			})

			sheetsDataProcessing.writeToSheets()

			global[eval[interaction.options.getString("username")]] = sheetsDataProcessing.ranking.makePlayer()

			interaction.reply("Registered!")
        }

	},
};