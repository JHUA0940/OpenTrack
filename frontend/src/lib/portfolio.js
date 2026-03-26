// Centralize portfolio-wide stats so the dashboard, charts, and prompt builder
// all stay in sync when the underlying snapshot changes.
export function sortPositionsByMarketValue(positions = []) {
  return [...positions].sort((left, right) => {
    const diff = Number(right.market_value ?? 0) - Number(left.market_value ?? 0)
    if (diff !== 0) return diff
    return String(left.ticker ?? '').localeCompare(String(right.ticker ?? ''))
  })
}

export function summarizePortfolio(positions = []) {
  const ordered = sortPositionsByMarketValue(positions)
  const totals = ordered.reduce(
    (acc, position, index) => {
      const marketValue = Number(position.market_value ?? 0)
      const pnl = Number(position.unrealized_pnl ?? 0)
      const weight = Number(position.weight_pct ?? 0)

      acc.totalValue += marketValue
      acc.totalPnl += pnl

      if (index < 3) {
        acc.topThreeWeight += weight
      }

      if (pnl > 0) {
        acc.positiveCount += 1
      } else if (pnl < 0) {
        acc.negativeCount += 1
      }

      acc.gainTotal += Math.max(pnl, 0)
      acc.lossTotal += Math.min(pnl, 0)
      acc.maxAbsPnl = Math.max(acc.maxAbsPnl, Math.abs(pnl))

      if (acc.biggestGain == null || pnl > Number(acc.biggestGain.unrealized_pnl ?? Number.NEGATIVE_INFINITY)) {
        acc.biggestGain = position
      }

      if (acc.biggestLoss == null || pnl < Number(acc.biggestLoss.unrealized_pnl ?? Number.POSITIVE_INFINITY)) {
        acc.biggestLoss = position
      }

      return acc
    },
    {
      totalValue: 0,
      totalPnl: 0,
      topThreeWeight: 0,
      positiveCount: 0,
      negativeCount: 0,
      gainTotal: 0,
      lossTotal: 0,
      biggestGain: null,
      biggestLoss: null,
      maxAbsPnl: 0,
    }
  )

  const costBasis = totals.totalValue - totals.totalPnl
  const returnPct = costBasis > 0 ? (totals.totalPnl / costBasis) * 100 : null
  const topHolding = ordered[0] ?? null
  const pnlBound = totals.maxAbsPnl > 0 ? totals.maxAbsPnl * 1.15 : 1

  return {
    ordered,
    totalValue: totals.totalValue,
    totalPnl: totals.totalPnl,
    costBasis,
    returnPct,
    topHolding,
    topThreeWeight: totals.topThreeWeight,
    positiveCount: totals.positiveCount,
    negativeCount: totals.negativeCount,
    gainTotal: totals.gainTotal,
    lossTotal: totals.lossTotal,
    biggestGain: totals.biggestGain,
    biggestLoss: totals.biggestLoss,
    maxAbsPnl: totals.maxAbsPnl,
    pnlBound,
  }
}
