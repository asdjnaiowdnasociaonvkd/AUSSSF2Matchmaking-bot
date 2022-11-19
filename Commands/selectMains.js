const { SlashCommandBuilder } = require('discord.js');
const sheetsDataProcessing = require('./../sheetsDataProcessing.js')
var choices = ["Chibi_Robo", "Krystal", "Lloyd", "Luffy", "Luigi", "Mario", "Megaman", "MetaKnight", "Mr_Game_And_Watch", "Ness", "Pac_Man", "Pichu", "Pikachu", "Pit", "Rayman", "Ryu", "Simon", "Sonic", "Sora", "Tails", "Waluigi", "Wario", "Yoshi", "Bandana_Dee", "Black_Mage", "Bomberman", "Bowser", "Captain_Falcon", "Donkey_Kong", "Falco", "Fox", "Ganondorf", "Goku", "Ichigo", "Issac", "Jigglypuff", "Kirby", "Link", "Lucario", "Marth", "Naruto", "Peach", "Samus", "SandBag", "Sheik", "Zelda", "Zero_Suit_Samus"]

module.exports = {
	data: new SlashCommandBuilder()
		.setName('mains')
		.setDescription('Choose your mains!(Selecting a character already set as a main will remove it instead)')
		.addStringOption(option =>
			option.setName("main")
				.setDescription("Choose your mains!")
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
		if (choices.includes(interaction.options.getString('main'))) {
			for (players in sheetsDataProcessing.playerData) {
				if (sheetsDataProcessing.playerData[players].playerID == interaction.user.id) {
					userPosition = players
				}
			}

			var playerMains = sheetsDataProcessing.playerData[userPosition].playerMains.split(", ")

			if (playerMains.includes(interaction.options.getString('main'))) {
				if (playerMains.length > 1) {
					playerMains = playerMains.filter(choice => choice != interaction.options.getString('main'))
					sheetsDataProcessing.playerData[userPosition].playerMains = playerMains.toString()
					sheetsDataProcessing.writeToSheets()
					await interaction.reply("Removed!")
				} else {
					sheetsDataProcessing.playerData[userPosition].playerMains = "None"
					sheetsDataProcessing.writeToSheets()
					await interaction.reply("Removed!")
				}
			} else if (sheetsDataProcessing.playerData[userPosition].playerMains == "None") {
				sheetsDataProcessing.playerData[userPosition].playerMains = interaction.options.getString('main')
				sheetsDataProcessing.writeToSheets()
				await interaction.reply("Added!")
			} else {
				sheetsDataProcessing.playerData[userPosition].playerMains = sheetsDataProcessing.playerData[userPosition].playerMains + ", " + interaction.options.getString('main')
				sheetsDataProcessing.writeToSheets()
				await interaction.reply("Added!")
            }

		} else {
			await interaction.reply({content:"Please choose a character from the options! If you do not see your character, input some letters.", ephemeral: true})
        }
	},
};