import {clientEmail, privateKey, spreadsheetId} from './credentials'
import {google} from 'googleapis'
import {generate} from './generate-games'
import {
  createNewTournamentSheet,
  fillTournamentSheet,
  styleHeaders,
} from './sheets'

function run(players: string[]) {
  const title = `Beanpong tournament ${new Date().toLocaleDateString()}(${Date.now()})`
  const games = generate(players)

  return createNewTournamentSheet(title)
    .then(({sheetId}) => styleHeaders({sheetId, games}))
    .then(() => fillTournamentSheet({title, games, players}))
}

const args = process.argv.slice(2)
const players = args[0].split(',').filter(Boolean)

if (players.length < 3) {
  console.log('A tournament needs at least 3 players..')
  process.exit(1)
}

const uniqe = new Set(players)
if (players.length !== uniqe.size) {
  console.log('All players need unique names')
  process.exit(1)
}

run(players)
  .then(() => {
    console.log('Tournament is ready!')
    process.exit(0)
  })
  .catch(err => {
    console.log('Error: ', err)
    process.exit(1)
  })
