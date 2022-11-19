//initialises discord api and connects bot to discord

const Discord = require('discord.js');
const { Events } = require('discord.js');

//defines what the bot will have access to

const client = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] });

//sends message once connected

client.once('ready', () => {
    console.log('Discord connection successful');
})

//Discord client key
const auth = require('./authkey')
client.login(auth.token);

//fs and path each are used to go to the "commands" folder
const fs = require('node:fs');
const path = require('node:path');
const Collection = Discord.Collection;

//Collection for commands- what do you think this is?
client.commands = new Collection();

//sets path to the commands folder
const commandsPath = path.join(__dirname, 'Commands');

//takes only js files out of the folder
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    //checks if the command is functional- if it is, pushes the command to the collection of commands
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
    } else {
        console.log("This command ain't working- you're missing data (command name and info) and execute (actions for the command to do)");
    }
}

//listening for commands
client.on(Events.InteractionCreate, async interaction => {

    //stops if the interaction is not a command
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    //checks if the command given is an actual command
    if (!command) {
        console.error("That ain't a command");
        return;
    }

    //attempts to launch the command
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: "There has been an error- try again", ephemeral: true });
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(error);
        }
    }
});