import test, {ExecutionContext} from 'ava'
import {generate, Game} from './generate-games'

const validateAmountOfGames = (
  players: string[],
  actual: Game[],
  t: ExecutionContext,
) => {
  const amountOfGames = players.length - 1
  const flatPlayers = actual.reduce<string[]>((a, b) => a.concat(b), [])
  players.forEach(player => {
    const count = flatPlayers.filter(f => f === player).length
    t.is(count, amountOfGames)
  })
}

test('3 players', t => {
  const players = ['one', 'two', 'three']
  const expected = [['one', 'two'], ['one', 'three'], ['two', 'three']]

  const actual = generate(players)

  t.deepEqual(actual, expected)

  validateAmountOfGames(players, actual, t)
})

test('4 players', t => {
  const players = ['one', 'two', 'three', 'four']
  const expected = [
    ['one', 'two'],
    ['one', 'three'],
    ['one', 'four'],
    ['two', 'three'],
    ['two', 'four'],
    ['three', 'four']
  ]

  const actual = generate(players)

  t.deepEqual(actual, expected)
  validateAmountOfGames(players, actual, t)
})
