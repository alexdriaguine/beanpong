import {clientEmail, privateKey, spreadsheetId} from './credentials'
import {google, sheets_v4} from 'googleapis'
import {Game} from './generate-games'

const googleAuthClient = new google.auth.JWT(
  clientEmail,
  undefined,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets'],
)
const sheets = google.sheets({version: 'v4', auth: googleAuthClient})

// Helper for the header color
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

export async function createNewTournamentSheet(title: string) {
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

export async function styleHeaders({
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
          repeatCell: getHeaderRepeatCellConfiguration({sheetId}),
        },
        {
          repeatCell: getHeaderRepeatCellConfiguration({
            sheetId,
            startRowIndex: games.length + 2,
            endRowIndex: games.length + 3,
            startColumnIndex: 0,
            endColumnIndex: 3,
          }),
        },
      ],
    },
  })
}

export async function fillTournamentSheet({
  title,
  games,
  players,
}: {
  title: string
  games: Game[]
  players: string[]
}) {
  const startOfStandings = games.length + 4 // offset. 1 is header, then n games, then one empty and one header

  return sheets.spreadsheets.values.update({
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
