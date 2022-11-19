const { SlashCommandBuilder } = require('discord.js');
const { ActionRowBuilder } = require('discord.js')
const { ButtonBuilder } = require('discord.js')
const { ButtonStyle } = require('discord.js')
const sheetsDataProcessing = require('./../sheetsDataProcessing.js');
var glicko2 = require('glicko2-lite')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('challenge')
		.setDescription('Challenge a player to games!')
		.addUserOption(option =>
			option.setName('player')
				.setDescription("Who are you challenging?")
				.setRequired(true)
			),
	async execute(interaction) {
		var challengerData = {playerUsername: "foo"}
		var challengedData = { playerUsername: "bar" }
		var challengerIndex = new Number
		var challengedIndex = new Number
		for (players in sheetsDataProcessing.playerData) {
			if (interaction.user.id == sheetsDataProcessing.playerData[players].playerID) {
				challengerData = sheetsDataProcessing.playerData[players]
				challengerIndex = players
			}

			if (interaction.options.getUser('player').id == sheetsDataProcessing.playerData[players].playerID) {
				challengedData = sheetsDataProcessing.playerData[players]
				challengedIndex = players
            }
        }

		var challengeButton = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('accept')
					.setLabel('Accept')
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId('decline')
					.setLabel('Decline')
					.setStyle(ButtonStyle.Danger)
			)

		var winnerButtons = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('challenger')
					.setLabel(challengerData.playerUsername)
					.setStyle(ButtonStyle.Primary),
				new ButtonBuilder()
					.setCustomId('challenged')
					.setLabel(challengedData.playerUsername)
					.setStyle(ButtonStyle.Primary)
			)

		timeout = setInterval(() => {
			interaction.editReply({ content: "Timed out!", components: [] })
		}, 15000)

		timeout2 = setInterval(() => {
			interaction.editReply({ content: "Timed out!", components: [] })
		}, 3600000)

		const filterOnChallenge = i => i.user.id === interaction.options.getUser('player').id;
		const collectorOnChallenge = interaction.channel.createMessageComponentCollector({ filter: filterOnChallenge, time: 15000 });

		collectorOnChallenge.on('collect', async i => {
			clearInterval(timeout)
			if (i.customId == 'accept') {
				await i.update({ content: "Challenge accepted! Each player should select the winner after the match is complete.", components: [winnerButtons] })
			} else if (i.customId == 'decline'){
				await i.update({ content: "Declined!", components: [] })
				challengedReport.stop()
				challengerReport.stop()
				collectorOnChallenge.stop()
            }
		})

		const filterForChallenger = i => i.user.id === interaction.user.id
		const filterForChallenged = i => i.user.id === interaction.options.getUser('player').id
		const challengerReport = interaction.channel.createMessageComponentCollector({ filter: filterForChallenger, time: 3600000 })
		const challengedReport = interaction.channel.createMessageComponentCollector({ filter: filterForChallenged, time: 3600000 })
		var counter = new Number
		var challengerLock = false
		var challengedLock = false
		var challengerReported = new String
		var challengedReported = new String
		var winner = new Object
		var loser = new Object	
		var winnerEndResult = new Object
		var loserEndResult = new Object
		var whoWon = new Number

		challengerReport.on('collect', async i => {
			if (challengerLock == true && (i.customId == 'challenger' || i.customId == 'challenged')) {
				await i.reply({ content: "You have already chosen the winner!", ephemeral: true })
			} else if (i.customId == 'challenger' || i.customId == 'challenged') {
				await i.reply({ content: "Winner Locked!", ephemeral: true })
				counter++
				console.log(counter)
				if (i.customId == 'challenger') {
					challengerReported = challengerData.playerUsername
					winner = challengerData
					loser = challengedData
					whoWon = 0
				} else if (i.customId == 'challenged') {
					challengerReported = challengedData.playerUsername
					winner = challengedData
					loser = challengerData
					whoWon = 1
                }
				challengerLock = true
				act()
            }
        })

		challengedReport.on('collect', async i => {
			if (challengedLock == true && (i.customId == 'challenger' || i.customId == 'challenged')) {
				await i.reply({ content: "You have already chosen the winner!", ephemeral: true })
			} else if (i.customId == 'challenger' || i.customId == 'challenged') {
				await i.reply({ content: "Winner Locked!", ephemeral: true })
				console.log(counter)
				counter++
				if (i.customId == 'challenger') {
					challengedReported = challengerData.playerUsername
				} else if (i.customId == 'challenged') {
					challengedReported = challengedData.playerUsername
				}
				challengedLock = true
				act()
			}
		})

		if (interaction.user.id == challengedData.playerID) {
			await interaction.reply({ content: "You can't challenge yourself!", ephemeral: true })
			challengedReport.stop()
			challengerReport.stop()
			collectorOnChallenge.stop()
		} else if (challengedData.playerID == undefined) {
			await interaction.reply({ content: "That player is not registered!", ephemeral: true })
			challengedReport.stop()
			challengerReport.stop()
			collectorOnChallenge.stop()
		} else if (challengerData.playerRating == undefined) {
			await interaction.reply({ content: "You are not registered!", ephemeral: true })
			challengedReport.stop()
			challengerReport.stop()
			collectorOnChallenge.stop()
		} else {
			await interaction.reply({ content: "<@" + interaction.user.id + "> has challenged <@" + interaction.options.getUser('player').id + ">", components: [challengeButton] })
		}

		async function act() {
			if (counter == 2) {
				if (challengerReported == challengedReported) {
					interaction.editReply({ content: challengedReported + " has won!", components: [] })
					winnerEndResult = glicko2(winner.playerRating, winner.playerDev, winner.playerVol, [[loser.playerRating, loser.playerDev, 1]])
					loserEndResult = glicko2(loser.playerRating, loser.playerDev, loser.playerVol, [[winner.playerRating, loser.playerDev, 0]])
					sheetsDataProcessing.recordMatch(winner.playerUsername, winnerEndResult.rating, (winnerEndResult.rating - winner.playerRating), loser.playerUsername, loserEndResult.rating, (loserEndResult.rating - loser.playerRating), winner.playerUsername)
					console.log(winner.playerRating)
					console.log(winnerEndResult.rating)
					if (whoWon == 1) {
						sheetsDataProcessing.playerData[challengerIndex].playerRating = winnerEndResult.rating
						sheetsDataProcessing.playerData[challengerIndex].playerDev = winnerEndResult.rd
						sheetsDataProcessing.playerData[challengerIndex].playerVol = winnerEndResult.vol
						sheetsDataProcessing.playerData[challengerIndex].playerWins = parseInt(sheetsDataProcessing.playerData[challengerIndex].playerWins) + 1
						sheetsDataProcessing.playerData[challengedIndex].playerRating = loserEndResult.rating
						sheetsDataProcessing.playerData[challengedIndex].playerDev = loserEndResult.rd
						sheetsDataProcessing.playerData[challengedIndex].playerVol = loserEndResult.vol
							sheetsDataProcessing.playerData[challengedIndex].playerLosses =parseInt(sheetsDataProcessing.playerData[challengedIndex].playerLosses) + 1
						if (parseInt(sheetsDataProcessing.playerData[challengerIndex].playerWins) + parseInt(sheetsDataProcessing.playerData[challengerIndex].playerLosses) == 5) {
							sheetsDataProcessing.playerData[challengerIndex].playerMax = sheetsDataProcessing.playerData[challengerIndex].playerRating
						} else if (parseInt(sheetsDataProcessing.playerData[challengerIndex].playerWins) + parseInt(sheetsDataProcessing.playerData[challengerIndex].playerLosses) > 5 && sheetsDataProcessing.playerData[challengerIndex].playerRating > sheetsDataProcessing.playerData[challengerIndex].playerMax) {
							sheetsDataProcessing.playerData[challengerIndex].playerMax = sheetsDataProcessing.playerData[challengerIndex].playerRating
						}
						if (sheetsDataProcessing.playerData[challengedIndex].playerWins + sheetsDataProcessing.playerData[challengedIndex].playerLosses == 5) {
							sheetsDataProcessing.playerData[challengedIndex].playerMax = sheetsDataProcessing.playerData[challengedIndex].playerRating
						} else if (parseInt(sheetsDataProcessing.playerData[challengedIndex].playerWins) + parseInt(sheetsDataProcessing.playerData[challengedIndex].playerLosses) > 5 && sheetsDataProcessing.playerData[challengedIndex].playerRating > sheetsDataProcessing.playerData[challengedIndex].playerMax) {
							sheetsDataProcessing.playerData[challengedIndex].playerMax = sheetsDataProcessing.playerData[challengedIndex].playerRating
						}
					} else if (whoWon == 0) {
						sheetsDataProcessing.playerData[challengedIndex].playerRating = winnerEndResult.rating
						sheetsDataProcessing.playerData[challengedIndex].playerDev = winnerEndResult.rd
						sheetsDataProcessing.playerData[challengedIndex].playerVol = winnerEndResult.vol
						sheetsDataProcessing.playerData[challengedIndex].playerWins = parseInt(sheetsDataProcessing.playerData[challengedIndex].playerWins) + 1
						sheetsDataProcessing.playerData[challengerIndex].playerRating = loserEndResult.rating
						sheetsDataProcessing.playerData[challengerIndex].playerDev = loserEndResult.rd
						sheetsDataProcessing.playerData[challengerIndex].playerVol = loserEndResult.vol
						sheetsDataProcessing.playerData[challengerIndex].playerLosses = parseInt(sheetsDataProcessing.playerData[challengerIndex].playerLosses) + 1
						if (parseInt(sheetsDataProcessing.playerData[challengerIndex].playerWins) + parseInt(sheetsDataProcessing.playerData[challengerIndex].playerLosses) == 5) {
							sheetsDataProcessing.playerData[challengerIndex].playerMax = sheetsDataProcessing.playerData[challengerIndex].playerRating
						} else if (parseInt(sheetsDataProcessing.playerData[challengerIndex].playerWins) + parseInt(sheetsDataProcessing.playerData[challengerIndex].playerLosses) > 5 && sheetsDataProcessing.playerData[challengerIndex].playerRating > sheetsDataProcessing.playerData[challengerIndex].playerMax) {
							sheetsDataProcessing.playerData[challengerIndex].playerMax = sheetsDataProcessing.playerData[challengerIndex].playerRating
						}
						if (sheetsDataProcessing.playerData[challengedIndex].playerWins + sheetsDataProcessing.playerData[challengedIndex].playerLosses == 5) {
							sheetsDataProcessing.playerData[challengedIndex].playerMax = sheetsDataProcessing.playerData[challengedIndex].playerRating
						} else if (parseInt(sheetsDataProcessing.playerData[challengedIndex].playerWins) + parseInt(sheetsDataProcessing.playerData[challengedIndex].playerLosses) > 5 && sheetsDataProcessing.playerData[challengedIndex].playerRating > sheetsDataProcessing.playerData[challengedIndex].playerMax) {
							sheetsDataProcessing.playerData[challengedIndex].playerMax = sheetsDataProcessing.playerData[challengedIndex].playerRating
						}
					}
					sheetsDataProcessing.writeToSheets()
					challengedLock = false
					challengerLock = false
					challengedReport.stop()
					challengerReport.stop()
					collectorOnChallenge.stop()
					clearInterval(timeout2)
				} else {
					counter = 0
					challengedLock = false
					challengerLock = false
					interaction.followUp({ content: "Both players chose different winners! Try again!", components: [] })
				}
			}
		}

    }
}