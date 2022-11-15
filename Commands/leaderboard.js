const { SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const { ActionRowBuilder } = require('discord.js')
const { ButtonBuilder } = require('discord.js')
const { ButtonStyle } = require('discord.js')
const sheetsDataProcessing = require('./../sheetsDataProcessing.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leaderboard')
		.setDescription('Check out the leaderboard!'),
	async execute(interaction) {
		const filter = i => i.user.id === interaction.user.id;
		const collector = interaction.channel.createMessageComponentCollector({ filter, time: 15000 });
		var leaderboardEligible = new Array
		var leftText = ""
		var rightText = ""
		var index = 1
		var pages = new Number
		var leaderboardText = new Array
		var page = new Array

		for (players in sheetsDataProcessing.playerData) {
			if (parseInt(sheetsDataProcessing.playerData[players].playerWins) + parseInt(sheetsDataProcessing.playerData[players].playerLosses) >= 5) {
				leaderboardEligible.push(sheetsDataProcessing.playerData[players])
			}
		}

		leaderboardEligible.sort((a, b) => b.playerRating - a.playerRating)
		for (player in leaderboardEligible) {
			playerText = (["**" + [parseInt(player) + 1] + ". ** <@" + leaderboardEligible[player].playerID + ">" + " - " + Math.floor(leaderboardEligible[player].playerRating) + "\n"])
			leaderboardText.push(playerText)
		}

		const leftButton = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('back')
					.setLabel('Back')
					.setStyle(ButtonStyle.Secondary)
		)

		const rightButton = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
					.setCustomId('next')
					.setLabel('Next')
					.setStyle(ButtonStyle.Secondary)
		)

		pages = Math.ceil([leaderboardText.length] / 10)

		async function generateEmbed() {
			page = leaderboardText.slice(10 * index - 10, 10 * index)
			var text = new String
			for (person in page) {
				text += page[person]
            }
			var leaderboard = new EmbedBuilder()
				.setColor(0x0099FF)
				.setTitle("Leaderboard")
				.setFields([])
			leaderboard.data.fields = [{ name: "Top " + [10* index - 9] + " - " + [page.length + 10*index - 10], value: text}] 
			return leaderboard
		}

		if (pages == 1) {
			interaction.reply({embeds: [await generateEmbed()]})
		} else {
			interaction.reply({embeds:[await generateEmbed()], components:[rightButton]})
        }

		collector.on('collect', async i => {
			if (i.customId == 'back') {
				index--
				console.log(index)
			} else if (i.customId == 'next'){
				index++
				console.log(index)
			}

			if (index == pages) {
				await i.update({
					embeds: [await generateEmbed()],
					components: [leftButton]
				})
			} else if (index == 1) {
				await i.update({
					embeds: [await generateEmbed()],
					components: [rightButton]
				})
			} else {
				await i.update({
					embeds: [await generateEmbed()],
					components: [leftButton, rightButton]
				})
				console.log(index)
            }
        })

		async function timeout() {
			await interaction.editReply({
				content: "Timeout!",
				embeds: [await generateEmbed()]
			})
        }

		setTimeout(timeout,15000)
	},
}