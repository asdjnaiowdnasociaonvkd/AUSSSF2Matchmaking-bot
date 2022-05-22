/*
 * tau will have to be tested- it is the volatility constant, and values can be anywhere between 0.3 and 1.2
 * I also only a very barebones idea of how glicko 2 works- the packages with the calculations were taken off mark glickman's website
 * initialises glicko 2 package
*/
var glicko2 = require('glicko2');
var settings = {
    //tau is just a constant
    tau: 0.3,
    //rating is the beginner rating
    rating: 1500,
    //rd is the beginner rating deviation- the smaller, the more confident we are on the rating
    rd: 350,
    //vol is default volatility- expected fluctuation
    vol: 0.06
};
var ranking = new glicko2.Glicko2(settings);

//connects bot to google sheets
//note that the way it interacts with google sheets is pretty inefficient- instead of modifying bits of data when needed, 
//it instead just copies all the data, modifies them, then replaces them. I might rewrite this bit at some point to make it better

    const { google } = require('googleapis');
    const keys = require('./googleSheetsCredentials.json')

    const googleClient = new google.auth.JWT(
        keys.client_email, null, keys.private_key, ['https://www.googleapis.com/auth/spreadsheets']
    );

    googleClient.authorize(function (err, tokens) {
        if (err) {
            console.log(err);
            return;
        } else {
            console.log('Google Sheets connection successful');
        }
    });

//id of the main spreadsheet
const mainSpreadsheetId = '1bNpjgLWWK72OWLSxywotLa-izOJBOhF0wKVrUI_K37U';
const sheets = google.sheets({ version: "v4", auth: googleClient })
var playerDataArray = [];
var matches = [];

async function readFromGoogleSheets() {

    //pulls all registered player's data
    var playerDataOnSheets = await sheets.spreadsheets.values.get({
        spreadsheetId: mainSpreadsheetId,
        range: "DataSheet!A2:J"
    });
    playerDataArray = playerDataOnSheets.data.values
    //pulls data for the glicko 2 implementation
    for (i = 0; i < playerDataArray.length; i++) {
        global[playerDataArray[i][3]] = ranking.makePlayer(playerDataArray[i][4], playerDataArray[i][5], playerDataArray[i][6])
    }
}

    //writes the player data down to sheets
async function writeToGoogleSheets() {
    sheets.spreadsheets.values.update({
        spreadsheetId: mainSpreadsheetId,
        range: 'DataSheet!A2:J',
        valueInputOption: 'USER_ENTERED',
        resource: { values: await playerDataArray }
    })
    console.log('write complete!')
}

//pulls player data from the sheet
readFromGoogleSheets();

//initialises discord api and connects bot to discord

    const Discord = require('discord.js');
    const client = new Discord.Client({ intents: ['GUILD_MEMBERS','GUILD_MESSAGES', 'GUILD_MESSAGE_TYPING'] });
    const { SlashCommandBuilder } = require('@discordjs/builders');
    const { REST } = require('@discordjs/rest');

    //sets up global variables
    var player1Id;
var player2Id;
var today = new Date()
var gameList = new Array();

for (let i = 0; i < playerDataArray.length; i++) {
    playerDataArray[i]
}

    client.once('ready', () => {
        console.log('Discord connection successful');

        //guildID will have to be modified to work for a specific server
        const guildID = '743364430816870400'
        const guild = client.guilds.cache.get(guildID)
        let commands

        if (guild) {
            commands = guild.commands
        } else {
            commands = client.application?.commands
        }

        //commands are created here- most commands are self explanatory

        commands?.create({
            name: 'ping',
            description: 'replies with pong, test command'
        })

        //adds user into the database

        commands.create({
            name: 'register',
            description: 'add youself to the database',
            options: [{
                name: "ingamename",
                description: 'What is your in game name?',
                required: true,
                type: 'STRING'
            }]
        })

    //update user data
        commands.create({
            name: 'usernameupdate',
            description: 'update your discord username an/or in game name',
            options: [{
                name: 'ign',
                description: 'your in game name',
                required: false,
                type: 'STRING'
            }]
        })

        //begins a new round
        commands.create({
            name: 'startmatch',
            description: 'start a new match',
            options: [
                {
                    name: 'playerone',
                    description: 'Ping player one here',
                    required: true,
                    type: 'USER'
                },
                {
                    name: 'playertwo',
                    description: 'Ping player two here',
                    required: true,
                    type: 'USER'
                }
            ]
        })

        commands.create({
            name: 'cancelmatch',
            description: 'cancel the match you re currently in'
        })

        //match reporting
        commands.create({
            name: 'reportmatch',
            description: 'Report match results here',
            options: [
                {
                    name: 'playerone',
                    description: 'Ping player 1 here',
                    required: true,
                    type: 'USER'
                },
                {
                    name: 'playertwo',
                    description: 'Ping player 2 here',
                    required: true,
                    type: 'USER'
                },
                {
                    name: 'winner',
                    description: 'Ping the winner here',
                    required: true,
                    type: 'USER'
                }]
        })

        commands.create({
            name: 'leaderboard',
            description: 'Call up the current leaderboard'
        })

        commands.create({
            name: 'profile',
            description: 'Check your profile'
        })
    })

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) {
        return
    }

    const { commandName, options } = interaction

    //how the bot will react to each command

    if (commandName === 'ping') {
        //replies with pong, test command
        interaction.reply({
            content: 'pong',
        })
    } else if (commandName === 'register') {
        //registers player to google sheets
        var playerID = await interaction.user.id

        //checks if player is already registered
        var isRegistered = new Boolean

        if (playerDataArray == null) {
            var newPlayer = ranking.makePlayer();
            //adds a new player to the array
            playerDataArray = [[
                //Discord ID
                await playerID,
                //Date
                today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
                //Discord Tag(Name)
                (await client.users.fetch(playerID)).tag,
                //In game name which was requested
                options.getString('ingamename'),
                //A new player's rating
                newPlayer.getRating(),
                //A new player's Deviation
                newPlayer.getRd(),
                //A new player's Volatility
                newPlayer.getVol(),
                //The next three numbers are for set wins, set losses and win rate- its just 0 because no games are played yet
                '0',
                '0',
                '0'
            ]]
            writeToGoogleSheets();
            interaction.reply({
                content: 'Registered!'
            })
        } else {

            //updates ifRegisted with data on whether you are registered or not
            for (let i = 0; i < playerDataArray.length; i++) {
                if (playerDataArray[i][0] === playerID) {
                    isRegistered = true
                    break
                }
            }

            if (isRegistered == true) {
                //take a wild guess at what this does
                interaction.reply('You are already registered!')
            } else {
                var newPlayer = ranking.makePlayer();
                //adds a new player to the array
                playerDataArray.push([
                    //Discord ID
                    await playerID,
                    //Date
                    today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
                    //Discord Tag(Name)
                    (await client.users.fetch(playerID)).tag,
                    //In game name which was requested
                    options.getString('ingamename'),
                    //A new player's rating
                    newPlayer.getRating(),
                    //A new player's Deviation
                    newPlayer.getRd(),
                    //A new player's Volatility
                    newPlayer.getVol(),
                    //The next three numbers are for set wins, set losses and win rate- its just 0 because no games are played yet
                    '0',
                    '0'
                ])
                writeToGoogleSheets();
                interaction.reply({
                    content: 'Registered!'
                })
            }
        }
    } else if (commandName === 'usernameupdate') {
        var playerID = await interaction.user.id
        for (let i = 0; i < playerDataArray.length; i++) {
            if (playerDataArray[i][0] === playerID) {
                playerDataArray[i][2] = (await client.users.fetch(playerID)).tag;
                if (options.getString('ign') !== null) {
                    playerDataArray[i][3] = options.getString('ign')
                }
            }
        }
        interaction.reply({
            content: 'Updated!'
        })
        writeToGoogleSheets();
    } else if (commandName === 'startmatch') {
        player1Id = (options.getMember('playerone')).id
        player2Id = (options.getMember('playertwo')).id
        var isPlayer1Registered = false;
        var isPlayer2Registered = false;
        for (let i = 0; i < playerDataArray.length; i++) {
            if (playerDataArray[i][0] === player1Id) {
                isPlayer1Registered = true
                break
            }
        }
        for (let i = 0; i < playerDataArray.length; i++) {
            if (playerDataArray[i][0] === player2Id) {
                isPlayer2Registered = true
                break
            }
        }
        if ((isPlayer1Registered == true) && (isPlayer2Registered == true)) {
            var isInGame = false;
            checkIfInGame:
            if (gameList !== null) {
                for (let i = 0; i < gameList.length; i++) {
                    if ((gameList[i][1] == player1Id || player2Id) || (gamelist[i][2] == player1Id || player2Id)) {
                        interaction.reply({
                            content: 'At least one of you two are already in a match!'
                        })
                        isInGame = true
                        break checkIfInGame
                    }
                }
            }
            if (isInGame == false) {
                if (gameList == null) {
                    gamelist = [[player1Id, player2Id]]
                } else {
                    gameList.push([player1Id, player2Id])
                }
                interaction.reply({
                    content: 'Round started!'
                })
            }
        } else {
            if (isPlayer1Registered == false && isPlayer2Registered == false) {
                interaction.reply('Neither player is registered!')
                console.log(isPlayer1Registered)
                console.log(isPlayer2Registered)
                console.log(player1Id)
                console.log(player2Id)
            } else if (isPlayer1Registered == false) {
                interaction.reply((await client.users.fetch(player1Id)).username + ' is not registered!')
            } else {
                interaction.reply((await client.users.fetch(player2Id)).username + ' is not registered!')
            }
        }
    } else if (commandName === 'cancelmatch') {
        var isPlayerInMatch = false
        var playerMatchId
        for (let i = 0; i < gameList.length; i++) {
            if ((gameList[i][0] || gameList[i][1]) == interaction.user.id) {
                isPlayerInMatch = true
                playerMatchId = i
                break
            }
        }
        if (isPlayerInMatch == true) {
            gameList.splice(playerMatchId)
            interaction.reply({
                content: 'Match cancelled!'
            })
        } else {
            interaction.reply({
                content: 'You are not in a match!'
            })
        }
    } else if (commandName === 'reportmatch') {
        player1Id = (options.getMember('playerone')).id
        player2Id = (options.getMember('playertwo')).id
        winningPlayerId = (options.getMember('winner')).id
        matchReporting:
        if (gameList.length > 0) {
            var areBothPlayersInTheSameGame = false;
            var gameListPosition
            for (let i = 0; i < playerDataArray.length; i++) {
                if (((gameList[i][0] === player1Id) || (gameList[i][1] === player1Id)) && ((gameList[i][0] === player2Id) || (gameList[i][1] === player2Id))) {
                    areBothPlayersInTheSameGame = true
                    gameListPosition = i
                    break
                } else {
                    areBothPlayersInTheSameGame = false
                }
            }
            if (areBothPlayersInTheSameGame == false) {
                interaction.reply({
                    content: 'You are in different games!'
                })
            } else {
                var player1DataArrayPosition
                var player2DataArrayPosition
                for (let i = 0; i < playerDataArray.length; i++) {
                    if (playerDataArray[i][0] === player1Id) {
                        player1DataArrayPosition = i
                        break
                    }
                }
                for (let i = 0; i < playerDataArray.length; i++) {
                    if (playerDataArray[i][0] === player2Id) {
                        player2DataArrayPosition = i
                        break
                    }
                }
                if (winningPlayerId == player1Id) {
                    matches.push([eval(playerDataArray[player1DataArrayPosition][3]), eval(playerDataArray[player2DataArrayPosition][3]), 1])
                    playerDataArray[player1DataArrayPosition][7] = parseInt(playerDataArray[player1DataArrayPosition][7]) + 1
                    playerDataArray[player1DataArrayPosition][8] = parseInt(playerDataArray[player1DataArrayPosition][8]) + 1
                    playerDataArray[player2DataArrayPosition][7] = parseInt(playerDataArray[player2DataArrayPosition][7]) + 1
                    playerDataArray[player2DataArrayPosition][9] = parseInt(playerDataArray[player2DataArrayPosition][9]) + 1
                } else {
                    matches.push([eval(playerDataArray[player1DataArrayPosition][3]), eval(playerDataArray[player2DataArrayPosition][3]), 0])
                    playerDataArray[player2DataArrayPosition][7] = parseInt(playerDataArray[player2DataArrayPosition][7]) + 1
                    playerDataArray[player2DataArrayPosition][8] = parseInt(playerDataArray[player2DataArrayPosition][8]) + 1
                    playerDataArray[player1DataArrayPosition][7] = parseInt(playerDataArray[player1DataArrayPosition][7]) + 1
                    playerDataArray[player1DataArrayPosition][9] = parseInt(playerDataArray[player1DataArrayPosition][9]) + 1
                }
                interaction.reply({
                    content: 'match recorded!'
                })
                ranking.updateRatings(matches)
                playerDataArray[player1DataArrayPosition][4] = eval(playerDataArray[player1DataArrayPosition][3]).getRating()
                playerDataArray[player1DataArrayPosition][5] = eval(playerDataArray[player1DataArrayPosition][3]).getRd()
                playerDataArray[player1DataArrayPosition][6] = eval(playerDataArray[player1DataArrayPosition][3]).getVol()
                playerDataArray[player2DataArrayPosition][4] = eval(playerDataArray[player2DataArrayPosition][3]).getRating()
                playerDataArray[player2DataArrayPosition][5] = eval(playerDataArray[player2DataArrayPosition][3]).getRd()
                playerDataArray[player2DataArrayPosition][6] = eval(playerDataArray[player2DataArrayPosition][3]).getVol()
                gameList.splice(gameListPosition)
                writeToGoogleSheets()
            }
        } else {
            interaction.reply({
                content: 'Neither of you are in a game!'
            })
        }
    } else if (commandName === 'leaderboard') {
        var leaderboardArray = []
        const maxPlayersPerPage = 10
        for (let i = 0; i < playerDataArray.length; i++) {
            leaderboardArray.push([playerDataArray[i][2], playerDataArray[i][4], playerDataArray[i][5]])
        }
        leaderboardArray.sort(function (a, b) { return a[1] < b[1] })
        console.log(leaderboardArray)
        const leaderboard = new Discord.MessageEmbed()
            .setColor('#FF2D00')
            .setTitle('Leaderboard')
        for (let i = 0; i < leaderboardArray.length; i++) {
            leaderboard.addField(i+1 + ". " + leaderboardArray[i][0], 'Rating: ' + leaderboardArray[i][1] +'\n' + 'RD: ' + leaderboardArray[i][2], true)
        }        

        interaction.reply({
            embeds: [leaderboard]
        })
    } else if (commandName === 'profile') {
        var playerArrayPosition
        for (let i = 0; i < playerDataArray.length; i++) {
            if (playerDataArray[i][0] === await interaction.user.id) {
                playerArrayPosition = i
                break
            }
        }
        const playerProfile = new Discord.MessageEmbed()
            .setColor('#0000FF')
            .setTitle(await interaction.user.username + "'s profile")
            .addFields(
                { name: 'IGN', value: playerDataArray[playerArrayPosition][3] },
                { name: 'Rating', value: ((playerDataArray[playerArrayPosition][4]).toString()).substring(0, 8) },
                { name: 'Deviation', value: ((playerDataArray[playerArrayPosition][5]).toString()).substring(0, 8) },
                { name: 'volatility', value: ((playerDataArray[playerArrayPosition][6]).toString()).substring(0,8) },
                { name: 'Wins', value: (playerDataArray[playerArrayPosition][7]).toString(), inline: true },
                { name: 'Losses', value: (playerDataArray[playerArrayPosition][8]).toString(), inline: true },
                { name: 'Win/Loss', value: (((playerDataArray[playerArrayPosition][7]) / (playerDataArray[playerArrayPosition][8])).toString()).substring(0, 8), inline: true }

        )
        interaction.reply({
embeds: [playerProfile]
        })
    }
    })

    //do not share this ever- with this key, anyone can access the bot
    client.login(/* replace this comment with discord key */);
