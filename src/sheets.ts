import {clientEmail, privateKey, spreadsheetId} from './credentials'
import {google, sheets_v4} from 'googleapis'
import {Game, generate} from './generate-games'
import {create} from 'domain'

const googleAuthClient = new google.auth.JWT(
  clientEmail,
  undefined,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets'],
)
const sheets = google.sheets({version: 'v4', auth: googleAuthClient})

const colors = {
  headerBackground: {
    red: 0.196,
    green: 0.592,
    blue: 0.568,
  },
  headerFont: {
    red: 1.0,
    green: 1.0,
    blue: 1.0,
  },
}

const headerText = {
  foregroundColor: colors.headerFont,
  fontSize: 12,
  bold: true,
}

const headerFields =
  'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'

async function createNewTournamentSheet(title: string) {
  const {
    data: {replies},
  } = await sheets.spreadsheets
    .batchUpdate({
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
    .catch(err => {
      throw err
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

  const {sheetId, title: sheetTitle} = sheetResponse.addSheet.properties

  return {sheetId, sheetTitle}
}

const getHeaderRepeatCellConfiguration = ({
  sheetId,
  startRowIndex = 0,
  endRowIndex = 1,
  startColumnIndex = 0,
  endColumnIndex = 5,
}: {
  sheetId: number
  startRowIndex?: number
  endRowIndex?: number
  startColumnIndex?: number
  endColumnIndex?: number
}): sheets_v4.Schema$RepeatCellRequest => ({
  range: {
    sheetId,
    startRowIndex,
    endRowIndex,
    startColumnIndex,
    endColumnIndex,
  },
  cell: {
    userEnteredFormat: {
      backgroundColor: colors.headerBackground,
      textFormat: headerText,
    },
  },
  fields: headerFields,
})

async function styleHeaders({
  sheetId,
  games,
}: {
  sheetId: number
  games: Game[]
}) {
  return sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: getHeaderRepeatCellConfiguration({
            sheetId,
            endColumnIndex: 7,
          }),
        },
        {
          repeatCell: getHeaderRepeatCellConfiguration({
            sheetId,
            startRowIndex: games.length + 2,
            endRowIndex: games.length + 3,
          }),
        },
      ],
    },
  })
}

async function fillTournamentSheet({
  title,
  games,
  players,
}: {
  title: string
  games: Game[]
  players: string[]
}) {
  const startOfStandings = (n: number) => games.length + 4 + n // offset. 1 is header, then n games, then one empty and one header
  const startOfGames = (n: number) => n + 2 // 1 is header, games starts at 2
  return sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1:G${games.length + 10}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          'Home',
          'Away',
          'HomeScore',
          'AwayScore',
          'Winner',
          'Knäck (+)',
          'Knäck (-)',
        ],
        ...games.map((game, i) => [
          ...game,
          undefined,
          undefined,
          `=IF(AND(C${startOfGames(i)}=0, D${startOfGames(
            i,
          )}=0), "Not played", IF(C${i + 2} - D${startOfGames(
            i,
          )} > 0, A${startOfGames(i)}, B${startOfGames(i)}))`,
          `=IF(AND(C${startOfGames(i)}=5, D${startOfGames(
            i,
          )}=0), A${startOfGames(i)}, IF(AND(D${i + 2}=5, C${startOfGames(
            i,
          )}=0), B${startOfGames(i)}, "-"))`,
          `=IF(F${startOfGames(i)}=A${startOfGames(i)}, B${startOfGames(
            i,
          )}, IF(F${startOfGames(i)}=B${startOfGames(i)}, A${startOfGames(
            i,
          )}, "-"))`,
        ]),
        [],
        ['Player', 'Wins', 'Knäck (+)', 'Knäck (-)', 'Points'],
        ...players.map((player, i) => [
          player,
          `=COUNTIF(E2:E${games.length + 1}, "${player}")`,
          `=COUNTIF(F2:F${games.length + 1}, A${startOfStandings(i)})`,
          `=COUNTIF(G2:G${games.length + 1}, A${startOfStandings(i)})`,
          `=B${startOfStandings(i)}*2 + C${startOfStandings(
            i,
          )} * 1 - D${startOfStandings(i)} * 1`,
        ]),
      ],
    },
  })
}

const catchAndRethrow = (err: Error) => {
  throw err
}

interface GenerateTournamentArgs {
  title: string
  players: string[]
}
export async function generateTournament({
  title,
  players,
}: GenerateTournamentArgs) {
  const games = generate(players)

  const {sheetId} = await createNewTournamentSheet(title).catch(catchAndRethrow)
  await styleHeaders({sheetId, games}).catch(catchAndRethrow)
  await fillTournamentSheet({title, games, players}).catch(catchAndRethrow)
  return sheetId
}
