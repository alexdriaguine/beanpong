import {clientEmail, privateKey, spreadsheetId} from './credentials'
import {promisify} from 'util'
import {google} from 'googleapis'

export type Game = [string, string]

export function generate(players: string[]): Game[] {
  const playerQueue = [...players]
  const games: Game[] = []

  while (playerQueue.length) {
    const current = playerQueue.shift()
    if (current) {
      playerQueue.forEach(player => games.push([current, player]))
    }
  }
  return games
}

enum SheetKeys {
  Home = 'Home',
  Away = 'Away',
  HomeScore = 'HomeScore',
  AwayScore = 'AwayScore',
}

async function run(players: string[]) {
  const title = `Beanpong tournament ${new Date().toLocaleDateString()}(${Date.now()})`

  const auth = new google.auth.JWT(clientEmail, undefined, privateKey, [
    'https://www.googleapis.com/auth/spreadsheets',
  ])
  const sheets = google.sheets({version: 'v4', auth})

  const {
    data: {replies},
  } = await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title,
            },
          },
        },
      ],
    },
  })

  if (!replies) {
    throw new Error('could not add a sheet')
  }

  const [sheetResponse] = replies

  if (
    !sheetResponse.addSheet ||
    !sheetResponse.addSheet.properties ||
    !sheetResponse.addSheet.properties.sheetId ||
    !sheetResponse.addSheet.properties.title
  ) {
    throw new Error('could not add a sheet')
  }

  const {sheetId} = sheetResponse.addSheet.properties

  const games = generate(players)

  const startOfStandings = games.length + 4 // offset. 1 is header, then n games, then one empty and one header

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: 5,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.196,
                  green: 0.592,
                  blue: 0.568,
                },
                textFormat: {
                  foregroundColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0,
                  },
                  fontSize: 12,
                  bold: true,
                },
              },
            },
            fields:
              'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        },
        {
          repeatCell: {
            range: {
              sheetId: sheetId,
              startRowIndex: games.length + 2,
              endRowIndex: games.length + 3,
              startColumnIndex: 0,
              endColumnIndex: 3,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.196,
                  green: 0.592,
                  blue: 0.568,
                },
                textFormat: {
                  foregroundColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0,
                  },
                  fontSize: 12,
                  bold: true,
                },
              },
            },
            fields:
              'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
          },
        },
      ],
    },
  })

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1:E${games.length + 10}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        ['Home', 'Away', 'HomeScore', 'AwayScore', 'Winner'],
        ...games.map((game, i) => [
          ...game,
          undefined,
          undefined,
          `=IF(AND(C${i + 2}=0, D${i + 2}=0), "Not played", IF(C${i +
            2} - D${i + 2} > 0, A${i + 2}, B${i + 2}))`,
        ]),
        [],
        ['Player', 'Wins', 'Points'],
        ...players.map((player, i) => [
          player,
          `=COUNTIF(E:E, "${player}")
          `,
          `=B${startOfStandings + i} * 2`,
        ]),
      ],
    },
  })
}

const args = process.argv.slice(2)
const players = args[0].split(',').filter(Boolean)

if (players.length < 3) {
  console.log('A tournament needs at least 3 players..')
  process.exit(1)
}

// Check so every player name is unique

const uniqe = new Set(players)

if (players.length !== uniqe.size) {
  console.log('All players need unique names')
  process.exit(1)
}

run(players)
  .then(() => console.log(console.log('Tournamet is ready!')))
  .catch(err => {
    console.log('Error: ', err)
    process.exit(1)
  })
