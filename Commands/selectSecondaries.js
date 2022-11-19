const { SlashCommandBuilder } = require('discord.js');
const sheetsDataProcessing = require('./../sheetsDataProcessing.js')
var choices = ["Chibi_Robo", "Krystal", "Lloyd", "Luffy", "Luigi", "Mario", "Megaman", "MetaKnight", "Mr_Game_And_Watch", "Ness", "Pac_Man", "Pichu", "Pikachu", "Pit", "Rayman", "Ryu", "Simon", "Sonic", "Sora", "Tails", "Waluigi", "Wario", "Yoshi", "Bandana_Dee", "Black_Mage", "Bomberman", "Bowser", "Captain_Falcon", "Donkey_Kong", "Falco", "Fox", "Ganondorf", "Goku", "Ichigo", "Issac", "Jigglypuff", "Kirby", "Link", "Lucario", "Marth", "Naruto", "Peach", "Samus", "SandBag", "Sheik", "Zelda", "Zero_Suit_Samus"]

module.exports = {
	data: new SlashCommandBuilder()
		.setName('secondary')
		.setDescription('Choose your secondaries!(Selecting a character already set as a secondary will remove it instead)')
		.addStringOption(option =>
			option.setName("secondary")
				.setDescription("Choose your secondaries!")
				.setRequired(true)
				.setAutocomplete(true)
	),
	async autocomplete(interaction) {
		const focusedOption = interaction.options.getFocused(true);
		const filtered = choices.filter(choice => choice.toUpperCase().startsWith(focusedOption.value.toUpperCase()))
		if (filtered.length > 25) {
			options = filtered.slice(0, 25);
		} else {
			options = filtered;
		}

		await interaction.respond(
			options.map(choice => ({ name: choice, value: choice })),
		);
    },
	async execute(interaction) {
		var userPosition = new Number
		if (choices.includes(interaction.options.getString('secondary'))) {
			for (players in sheetsDataProcessing.playerData) {
				if (sheetsDataProcessing.playerData[players].playerID == interaction.user.id) {
					userPosition = players
				}
			}

			var playerSecondaries = sheetsDataProcessing.playerData[userPosition].playerSecondaries.split(", ")

			if (playerSecondaries.includes(interaction.options.getString('secondary'))) {
				if (playerSecondaries.length > 1) {
					playerSecondaries = playerSecondaries.filter(choice => choice != interaction.options.getString('secondary'))
					sheetsDataProcessing.playerData[userPosition].playerSecondaries = playerSecondaries.toString()
					sheetsDataProcessing.writeToSheets()
					await interaction.reply("Removed!")
				} else {
					sheetsDataProcessing.playerData[userPosition].playerSecondaries = "None"
					sheetsDataProcessing.writeToSheets()
					await interaction.reply("Removed!")
				}
			} else if (sheetsDataProcessing.playerData[userPosition].playerSecondaries == "None") {
				sheetsDataProcessing.playerData[userPosition].playerSecondaries = interaction.options.getString('secondary')
				sheetsDataProcessing.writeToSheets()
				await interaction.reply("Added!")
			} else {
				sheetsDataProcessing.playerData[userPosition].playerSecondaries = sheetsDataProcessing.playerData[userPosition].playerSecondaries + ", " + interaction.options.getString('secondary')
				sheetsDataProcessing.writeToSheets()
				await interaction.reply("Added!")
            }

		} else {
			await interaction.reply({content:"Please choose a character from the options! If you do not see your character, input some letters.", ephemeral: true})
        }
	},
};