/*
 * tau will have to be tested- it is the volatility constant, and values can be anywhere between 0.3 and 1.2
 * I also only a very barebones idea of how glicko 2 works- the packages with the calculations were taken off mark glickman's website
 * initialises glicko 2 package
*/
var glicko2 = require('glicko2');
var settings = {
    //tau is just a constant
    tau: 0.5,
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
//player's data stored in these two
var rawPlayerDataArray = [];
var playerArray = []

async function readFromGoogleSheets() {

    //pulls all registered player's data
    var playerDataOnSheets = await sheets.spreadsheets.values.get({
        spreadsheetId: mainSpreadsheetId,
        range: "DataSheet!A2:J"
    });
    rawPlayerDataArray = playerDataOnSheets.data.values
    //sorts rawPlayerDataArray into a more readable format
    function sortToPlayerArray(dataSet) {
        playerArray.push(
            {
                discordID: dataSet[0],
                dateAdded: dataSet[1],
                discordName: dataSet[2],
                IGN: dataSet[3],
                currentRating: parseFloat(dataSet[4]),
                currentDeviation: parseFloat(dataSet[5]),
                currentViolatility: parseFloat(dataSet[6]),
                gameCount: parseInt(dataSet[7]),
                gamesWon: parseInt(dataSet[8]),
                gamesLost: parseInt(dataSet[9]),
                winLoss: parseInt(dataSet[8]) / parseInt(dataSet[8])
            }
        )
    }
    rawPlayerDataArray.forEach(sortToPlayerArray)
    //pulls data for the glicko 2 implementation
    for (i = 0; i < playerArray.length; i++) {
        global[playerArray[i].IGN] = ranking.makePlayer(playerArray[i].currentRating, playerArray[i].currentDeviation, playerArray[i].currentViolatility)
    }
}

    //writes the player data down to sheets
async function writeToGoogleSheets() {
    rawPlayerDataArray = []
    function sheetsUpdateData(dataGiven) {
        rawPlayerDataArray.push(
            [
                dataGiven.discordID,
                dataGiven.dateAdded,
                dataGiven.discordName,
                dataGiven.IGN,
                dataGiven.currentRating,
                dataGiven.currentDeviation,
                dataGiven.currentViolatility,
                dataGiven.gameCount,
                dataGiven.gamesWon,
                dataGiven.gamesLost
            ]
        )
    }
    playerArray.forEach(sheetsUpdateData)
    sheets.spreadsheets.values.update({
        spreadsheetId: mainSpreadsheetId,
        range: 'DataSheet!A2:J',
        valueInputOption: 'USER_ENTERED',
        resource: { values: await rawPlayerDataArray }
    })
    console.log('write complete!')
}

//pulls player data from the sheet
readFromGoogleSheets();

//initialises discord api and connects bot to discord

const Discord = require('discord.js');
const client = new Discord.Client({ intents: ['GUILD_MEMBERS','GUILD_MESSAGES', 'GUILD_MESSAGE_TYPING'] });

//sets up global variables
var player1Id;
var player2Id;
var gameList = new Array();
var matches = [];

//connecting to discord
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
            const today = new Date()
        if (rawPlayerDataArray == null) {
            //adds a new player to the array
            playerArray = [
                {
                //Discord ID
                discordID: await playerID,
                //Date
                dateAdded: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
                //Discord Tag(Name)
                discordName: (await client.users.fetch(playerID)).tag,
                //In game name which was requested
                IGN: options.getString('ingamename'),
                //A new player's rating
                currentRating: settings.rating,
                //A new player's Deviation
                currentDeviation: settings.rd,
                //A new player's Volatility
                currentViolatility: settings.vol,
                //The next four numbers are for game count, set wins, set losses and win rate- its just 0 because no games are played yet
                gameCount: 0,
                gamesWon: 0,
                gamesLost: 0,
                winLoss: 0
                }
            ]
            writeToGoogleSheets();
            global[eval[playerArray[0].IGN]] = ranking.makePlayer(playerArray[0].currentRating, playerArray[0].currentDeviation, playerArray[0].currentViolatility)
            interaction.reply({
                content: 'Registered!'
            })
        } else {

            //updates ifRegisted with data on whether you are registered or not
            for (let i = 0; i < playerArray.length; i++) {
                if (playerArray[i].discordID === playerID) {
                    isRegistered = true
                    break
                }
            }

            if (isRegistered == true) {
                //take a wild guess at what this does
                interaction.reply('You are already registered!')
            } else {
                //adds a new player to the array
                playerArray.push(
                    {
                    //Discord ID
                    discordID: await playerID,
                    //Date
                    dateAdded: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
                    //Discord Tag(Name)
                    discordName: (await client.users.fetch(playerID)).tag,
                    //In game name which was requested
                    IGN: options.getString('ingamename'),
                    //A new player's rating
                    currentRating: settings.rating,
                    //A new player's Deviation
                    currentDeviation: settings.rd,
                    //A new player's Volatility
                    currentViolatility: settings.vol,
                    //The next four numbers are for game count, set wins, set losses and win rate- its just 0 because no games are played yet
                    gameCount: 0,
                    gamesWon: 0,
                    gamesLost: 0,
                    winLoss: 0
                }
                )
                writeToGoogleSheets();
                global[eval[playerArray[playerArray.length - 1].IGN]] = ranking.makePlayer(playerArray[playerArray.length - 1].currentRating, playerArray[playerArray.length - 1].currentDeviation, playerArray[playerArray.length - 1].currentViolatility)
                interaction.reply({
                    content: 'Registered!'
                })
            }
        }
    } else if (commandName === 'usernameupdate') {
        var playerID = await interaction.user.id
        for (let i = 0; i < playerArray.length; i++) {
            if (playerArray[i].discordID === playerID) {
                playerArray[i].discordName = (await client.users.fetch(playerID)).tag;
                if (options.getString('ign') !== null) {
                    playerArray[i].IGN = options.getString('ign')
                    ranking = new glicko2.Glicko2(settings)
                    for (i = 0; i < playerArray.length; i++) {
                        global[playerArray[i].IGN] = ranking.makePlayer(playerArray[i].currentRating, playerArray[i].currentDeviation, playerArray[i].currentViolatility)
                    }
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
        for (let i = 0; i < playerArray.length; i++) {
            if (playerArray[i].discordID === player1Id) {
                isPlayer1Registered = true
                break
            }
        }
        for (let i = 0; i < playerArray.length; i++) {
            if (playerArray[i].discordID === player2Id) {
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
            for (let i = 0; i < playerArray.length; i++) {
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
                var p1Pos
                var p2Pos
                for (let i = 0; i < playerArray.length; i++) {
                    if (playerArray[i].discordID === player1Id) {
                        p1Pos = i
                        break
                    }
                }
                for (let i = 0; i < rawPlayerDataArray.length; i++) {
                    if (playerArray[i].discordID === player2Id) {
                        p2Pos = i
                        break
                    }
                }
                if (winningPlayerId == player1Id) {
                    matches.push([eval(playerArray[p1Pos].IGN), eval(playerArray[p2Pos].IGN), 1])
                    playerArray[p1Pos].gameCount += 1
                    playerArray[p1Pos].gamesWon += 1
                    playerArray[p2Pos].gameCount += 1
                    playerArray[p2Pos].gamesLost += 1
                } else {
                    matches.push([eval(playerArray[p1Pos].IGN), eval(playerArray[p2Pos].IGN), 0])
                    playerArray[p2Pos].gameCount += 1
                    playerArray[p2Pos].gamesWon += 1
                    playerArray[p1Pos].gameCount += 1
                    playerArray[p1Pos].gamesLost += 1
                }
                interaction.reply({
                    content: 'match recorded!'
                })
                ranking.updateRatings(matches)
                playerArray[p1Pos].currentRating = eval(playerArray[p1Pos].IGN).getRating()
                playerArray[p1Pos].currentDeviation = eval(playerArray[p1Pos].IGN).getRd()
                playerArray[p1Pos].currentViolatility = eval(playerArray[p1Pos].IGN).getVol()
                playerArray[p2Pos].currentRating = eval(playerArray[p2Pos].IGN).getRating()
                playerArray[p2Pos].currentDeviation = eval(playerArray[p2Pos].IGN).getRd()
                playerArray[p2Pos].currentViolatility = eval(playerArray[p2Pos].IGN).getVol()
                gameList.splice(gameListPosition)
                writeToGoogleSheets()
            }
        } else {
            interaction.reply({
                content: 'Neither of you are in a game!'
            })
        }
    } else if (commandName === 'leaderboard') {
        //this is a work in progress- i'll have to get more work done to expand this
        var leaderboardArray = []
        for (let i = 0; i < playerArray.length; i++) {
            leaderboardArray.push(
                {
                    name: playerArray[i].discordName,
                    leaderboardRating: playerArray[i].currentRating,
                    leaderboardRd: playerArray[i].currentDeviation
                }
            )
        }
        function compare(a, b) {
            if (a.leaderboardRating > b.leaderboardRating) {
                return -1;
            }
            if (a.leaderboardRating < b.leaderboardRating) {
                return 1;
            }
            return 0;
        }

        leaderboardArray.sort(compare);
        console.log(leaderboardArray)
        const leaderboard = new Discord.MessageEmbed()
            .setColor('#FF2D00')
            .setTitle('Leaderboard')
        for (let i = 0; i < leaderboardArray.length; i++) {
            leaderboard.addField(i + 1 + ". " + leaderboardArray[i].name, 'Rating: ' + leaderboardArray[i].leaderboardRating.toFixed(3) + '\n' + 'RD: ' + leaderboardArray[i].leaderboardRd.toFixed(3), true)
        }

        interaction.reply({
            embeds: [leaderboard]
        })
    } else if (commandName === 'profile') {
        //another work in progress, although this is more with the embed- i'll add rank later
        var playerPos
        var rank
        var leaderboardArray=[]
        for (let i = 0; i < playerArray.length; i++) {
            leaderboardArray.push(
                {
                    name: playerArray[i].discordName,
                    leaderboardRating: playerArray[i].currentRating,
                    leaderboardRd: playerArray[i].currentDeviation
                }
            )
        }
        function compare(a, b) {
            if (a.leaderboardRating > b.leaderboardRating) {
                return -1;
            }
            if (a.leaderboardRating < b.leaderboardRating) {
                return 1;
            }
            return 0;
        }
        for (let i = 0; i < playerArray.length; i++) {
            if (playerArray[i].discordID === await interaction.user.id) {
                playerPos = i
                break
            }
        }
        leaderboardArray.sort(compare);
        for (let i = 0; i < leaderboardArray.length; i++) {
            if (leaderboardArray[i].name === playerArray[playerPos].discordName) {
                rank = i + 1
                break
            }
        }
        const playerProfile = new Discord.MessageEmbed()
            .setThumbnail(await interaction.user.avatarURL())
            .setColor('#0000FF')
            .setTitle(await interaction.user.username + "'s profile")
            .addFields(
                { name: 'IGN', value: playerArray[playerPos].discordName },
                { name: 'Rank', value: rank.toString()},
                { name: 'Rating', value: playerArray[playerPos].currentRating.toFixed(3).toString() },
                { name: 'Deviation', value: playerArray[playerPos].currentDeviation.toFixed(3).toString() },
                { name: 'volatility', value: playerArray[playerPos].currentViolatility.toFixed(3).toString() },
                { name: 'Wins', value: (playerArray[playerPos].gamesWon).toString(), inline: true },
                { name: 'Losses', value: (playerArray[playerPos].gamesLost).toString(), inline: true },
                { name: 'Win/Loss', value: (playerArray[playerPos].gamesWon / playerArray[playerPos].gamesLost).toFixed(2).toString(), inline: true }

            )
        interaction.reply({
            embeds: [playerProfile]
        })
    }
    })

    //do not share this ever- with this key, anyone can access the bot
client.login('OTc0MjgxNDcwMzE3MzA1OTM2.GOAumn.Ih6hSzR4K33V9-0EIwJ_zr4An9bPFuPO4tWJUA');