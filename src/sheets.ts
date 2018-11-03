import {clientEmail, privateKey, spreadsheetId} from './credentials'
import {google, sheets_v4} from 'googleapis'
import {Game, generate} from './generate-games'
import {create} from 'domain'
import {isDeepStrictEqual} from 'util'

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

const maxPoints = 5
const startOfStandingsRowOffest = 4
const startOfGamesRowOffset = 2
const startOfStandings = (n: number, gamesLength: number) =>
  gamesLength + startOfStandingsRowOffest + n
const startOfGames = (n: number) => n + startOfGamesRowOffset
const getCell = (column: string, row: number | string) => `${column}${row}`

const GameColumns = {
  Home: 'A',
  Away: 'B',
  HomeScore: 'C',
  AwayScore: 'D',
  Winner: 'E',
  'Knäck (+)': 'F',
  'Knäck (-)': 'G',
}

const StandingsColumns = {
  Player: 'A',
  Wins: 'B',
  'Knäck (+)': 'C',
  'Knäck (-)': 'D',
  Points: 'F',
}

const ifElse = (condition: string, ifTrue: string, ifFalse: string) =>
  `IF(${condition}, ${ifTrue}, ${ifFalse})`
const and = (...conditions: string[]) => `AND(${conditions.join(', ')})`

const countIf = (condition: string) => `COUNTIF(${condition})`

const winPoints = 2
const extraPoints = 1

const getTotalScore = (currentRowNumber: number) =>
  `=B${currentRowNumber}*${winPoints} + C${currentRowNumber}*${extraPoints} - D${currentRowNumber}*${extraPoints}`

// Helper to remember whats going on when sending undefined
type EmptyColumn = undefined
const emptyColumn = (): EmptyColumn => undefined
type EmptyRow = []
const emptyRow = (): EmptyRow => []

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
  return sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${title}!A1:G${games.length + 10}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        Object.keys(GameColumns),
        ...games.map((game, i) => {
          const currentRowNumber = startOfGames(i)

          return [
            ...game,
            emptyColumn(),
            emptyColumn(),
            `=${ifElse(
              `${and(
                `${getCell(GameColumns.HomeScore, currentRowNumber)}=0`,
                `${GameColumns.AwayScore}${currentRowNumber}=0`,
              )}`,
              `"-"`,
              `${ifElse(
                `${maxPoints} - D${currentRowNumber} > 0`,
                `A${currentRowNumber}`,
                `B${currentRowNumber}`,
              )}`,
            )}`,
            `=${ifElse(
              `${and(
                `C${currentRowNumber}=${maxPoints}`,
                `D${currentRowNumber}=0`,
              )}`,
              `A${currentRowNumber}`,
              `${ifElse(
                and(
                  `D${currentRowNumber}=${maxPoints}`,
                  `C${currentRowNumber}=0`,
                ),
                `B${currentRowNumber}`,
                `"-"`,
              )}`,
            )}`,
            `=${ifElse(
              `F${currentRowNumber}=A${currentRowNumber}`,
              `B${currentRowNumber}`,
              `${ifElse(
                `F${currentRowNumber}=B${currentRowNumber}`,
                `A${currentRowNumber}`,
                `"-"`,
              )}`,
            )}`,
          ]
        }),
        emptyRow(),
        Object.keys(StandingsColumns),
        ...players.map((player, i) => {
          const currentRowNumber = startOfStandings(i, games.length)

          return [
            player,
            `=${countIf(`E2:E${games.length + 1}, "${player}"`)}`,
            `=${countIf(`F2:F${games.length + 1}, A${currentRowNumber}`)}`,
            `=${countIf(`G2:G${games.length + 1}, A${currentRowNumber}`)}`,
            getTotalScore(currentRowNumber),
          ]
        }),
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
