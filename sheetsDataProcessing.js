const { google } = require('googleapis');
var rawData = []
var rawPull = []
var playerData = []
const keys = require('./googleAPICredentials.json');

//connecting bot to google api
   const googleClient = new google.auth.JWT(
        keys.client_email, null, keys.private_key, ['https://www.googleapis.com/auth/spreadsheets']
    );

    //connects bot to google sheets
    googleClient.authorize(function (err, tokens) {
        if (err) {
            console.log(err);
            return;
        } else {
            console.log('Google API connection successful');
        }
    });

const sheets = google.sheets({ version: "v4", auth: googleClient })

//initialise glicko 2
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

//pulls all data on sheets

async function getData() {
    rawPull = await sheets.spreadsheets.values.get({
        spreadsheetId: "1bNpjgLWWK72OWLSxywotLa-izOJBOhF0wKVrUI_K37U",
        range: "Player_Data!A2:K",
        majorDimension: "ROWS"
    });

    rawData = rawPull.data.values
}

//writes onto sheets

async function writeToSheets() {
    var toExport = []
        for (players in await playerData) {
            toExport.push([
                playerData[players].playerID,
                playerData[players].playerUsername,
                playerData[players].playerRating,
                playerData[players].playerDev,
                playerData[players].playerVol,
                playerData[players].playerWins,
                playerData[players].playerLosses,
                playerData[players].playerMains,
                playerData[players].playerSecondaries,
                playerData[players].playerPocket,
                playerData[players].playerMax
            ])
        }

        sheets.spreadsheets.values.update({
            spreadsheetId: "1bNpjgLWWK72OWLSxywotLa-izOJBOhF0wKVrUI_K37U",
            range: "Player_Data!A2:K",
            valueInputOption: "USER_ENTERED",
            resource: { values: await toExport }
        })
}


//sorts data into objects
async function sortData() {
    for (let data in rawData) {
        playerData.push({
            "playerID": rawData[data][0],
            "playerUsername": rawData[data][1],
            "playerRating": rawData[data][2],
            "playerDev": rawData[data][3],
            "playerVol": rawData[data][4],
            "playerWins": rawData[data][5],
            "playerLosses": rawData[data][6],
            "playerMains": rawData[data][7],
            "playerSecondaries": rawData[data][8],
            "playerPocket": rawData[data][9],
            "playerMax": rawData[data][10]
        })
    }
}

//passing the data to the glicko 2 module
async function glickoSetup() {
    for (player in playerData) {
        //note that players are identified by their discord ID, rather than a username
        global[eval[playerData[player].playerID]] = ranking.makePlayer(playerData[player].playerRating, playerData[player].playerDev, playerData[player].playerVol)
    }
}

getData().then(sortData).then(glickoSetup)

//push playerdata out
module.exports = {
    playerData,
    rawData,
    ranking,
    writeToSheets
}