const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const charToKeys = require('./../charsToKeys.json')
const sheetsDataProcessing = require('./../sheetsDataProcessing.js')
var mains = new String
var secondaries = new String
var pockets = new String

module.exports = {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Check your profile')
		.addUserOption(option =>
			option.setName('player')
				.setDescription("Who's profile (you can leave if empty if your own)")
				.setRequired(false)
	),
	async execute(interaction) {
		var target = interaction.options.getUser('player')
		var ID = interaction.user.id
		var userPosition = new Number
		var isReg = false
		var targeted = false
		var mainChars = new String
		var secondaryChars = new String
		var pocketChars = new String
		var winRate = new String
		var highestRating = new String

		//check if target was given
		if (target != null) {
			targeted = true
        }

		if (targeted) {
			if (target.id == ID) {
				target = ID
			} else {
				target = target.id
            }
		} else {
			target = ID
        }

		//checks if player is registered
		for (players in sheetsDataProcessing.playerData) {
			if (sheetsDataProcessing.playerData[players].playerID == target) {
				userPosition = players
				isReg = true
            }
		}

		//confirms if target is registered, if it is, sends the embed
		if (isReg) {
			//setting up characters they play

				mains = sheetsDataProcessing.playerData[userPosition].playerMains.split(", ")
				for (char in mains) {
					mainChars += charToKeys[mains[char]]
                }
				secondaries = sheetsDataProcessing.playerData[userPosition].playerSecondaries.split(", ")
				for (char in secondaries) {
					secondaryChars += charToKeys[secondaries[char]]
				}
				pockets = sheetsDataProcessing.playerData[userPosition].playerPocket.split(", ")
				for (char in pockets) {
					pocketChars += charToKeys[pockets[char]]
				}

			if (parseInt(sheetsDataProcessing.playerData[userPosition].playerWins) + parseInt(sheetsDataProcessing.playerData[userPosition].playerLosses) == 0) {
				winRate = "No games played."
			} else {
				winRate = (Math.ceil((parseInt(sheetsDataProcessing.playerData[userPosition].playerWins) / (parseInt(sheetsDataProcessing.playerData[userPosition].playerWins) + parseInt(sheetsDataProcessing.playerData[userPosition].playerLosses)))*100)) + "%"
			}

			if (parseInt(sheetsDataProcessing.playerData[userPosition].playerWins) + parseInt(sheetsDataProcessing.playerData[userPosition].playerLosses) > 5) {
				highestRating = sheetsDataProcessing.playerData[userPosition].playerMax
			} else {
				highestRating = "Play more games!"
            }

			var profileEmbed = new EmbedBuilder()
				.setColor(0x0099FF)
				.setTitle(sheetsDataProcessing.playerData[userPosition].playerUsername + "'s profile")
				.addFields(	
					{ name: "Characters", value: "**Mains: **" + mainChars + " \n **Secondaries: **" + secondaryChars + " \n **Pockets: **" + pocketChars, inline: true },
					{ name: "\u200B", value: "\u200B", inline: true },
					{ name: "Statistics", value: "**Win Rate: **" + winRate + "\n **Current Rating: **" + sheetsDataProcessing.playerData[userPosition].playerRating + "\n **Hightest Rating: **" + highestRating, inline: true },
			)
			await interaction.reply({ embeds: [profileEmbed] });
		} else if (interaction.user.id != await target) {
			interaction.reply('That player is not registered!')
		} else {
			interaction.reply('You are not registered.')
        }
	},
};
