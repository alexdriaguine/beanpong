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