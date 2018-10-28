import {generateTournament} from './sheets'
import program from 'commander'
import ow from 'ow'
import ora from 'ora'
import {spreadsheetId} from './credentials'

function run(players: string[]) {
  const title = `Beanpong tournament ${new Date().toLocaleDateString()}(${Date.now()})`

  return generateTournament({title, players})
}

const validateTitle = ow.create(ow.string.minLength(2))
const validatePlayers = ow.create(ow.array.ofType(ow.string).minLength(3))

const validate = (fn: () => void) => {
  try {
    fn
    return [null]
  } catch (err) {
    return [err.message]
  }
}

const parseList = (val: string) => val.split(',')
program
  .version('0.0.1')
  .usage('<options>')
  .arguments('<title> <players>')
  .option('-t, --title <title>', 'Title of tournament')
  .option('-p, --players <players>', 'Players', parseList)
  .parse(process.argv)

const spinner = ora('Generating sheet').start()
const {title, players} = program

try {
  validatePlayers(players)
  validateTitle(title)
} catch (err) {
  spinner.fail(err.message)
  process.exit(1)
}

generateTournament({title, players})
  .then(sheetId => {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheetId}`
    spinner.succeed(`Tournament generated! Check it out at ${url}`)
    process.exit(0)
  })
  .catch(err => {
    spinner.fail(err.message)
    process.exit(1)
  })
