export interface ArbitrageCalculation {
  stake1: number
  stake2: number
  stake3?: number
  totalStake: number
  profit: number
  profitPercentage: number
  outcomes: {
    outcome1: { description: string; result: number }
    outcome2: { description: string; result: number }
    outcome3?: { description: string; result: number }
  }
}

export const calculateArbitrage = (odds: Record<string, number>, totalStake: number): ArbitrageCalculation => {
  const oddValues = Object.values(odds)
  const oddKeys = Object.keys(odds)

  // Calculate individual stakes
  const totalImpliedProbability = oddValues.reduce((sum, odd) => sum + 1 / odd, 0)

  const stakes = oddValues.map((odd) => totalStake / (odd * totalImpliedProbability))

  // Calculate outcomes
  const outcomes: any = {}

  oddKeys.forEach((key, index) => {
    const winnings = stakes[index] * oddValues[index]
    const profit = winnings - totalStake

    outcomes[`outcome${index + 1}`] = {
      description: key.replace("_odd", "").replace("_", " "),
      result: profit,
    }
  })

  const minProfit = Math.min(...Object.values(outcomes).map((o: any) => o.result))

  return {
    stake1: stakes[0],
    stake2: stakes[1],
    stake3: stakes[2],
    totalStake: stakes.reduce((sum, stake) => sum + stake, 0),
    profit: minProfit,
    profitPercentage: (minProfit / totalStake) * 100,
    outcomes,
  }
}
