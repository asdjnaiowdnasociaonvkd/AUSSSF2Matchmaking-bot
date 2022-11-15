const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const auth = require('./authkey.json');
const fs = require('node:fs');

const commands = [];

//pulls all commands in the commands file
const commandsFiles = fs.readdirSync('./Commands').filter(file => file.endsWith('.js'));

for (const file of commandsFiles) {
	const command = require(`./Commands/${file}`);
	commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(auth.token);

//command deployment
(async () => {
	try {
		console.log(`Sending slash commands...`);


		const data = await rest.put(
			Routes.applicationGuildCommands(auth.clientID, auth.guildID),
			{ body: commands },
		);

		console.log(`Commands successfully loaded`);
	} catch (error) {
		console.error(error);
	}
})();