import {
  formatAUD,
  formatDateAU,
  formatNumber,
  formatPct,
  formatSignedAUD,
  formatSignedPct,
} from './formatters'
import { summarizePortfolio } from './portfolio'

export function buildShareablePrompt(snapshot, summary = summarizePortfolio(snapshot?.positions ?? [])) {
  const positions = summary.ordered
  const snapshotDate = formatDateAU(snapshot?.snapshot_date)
  const totalValue = Number(snapshot?.total_value ?? 0)
  const biggestGain = summary.biggestGain
  const biggestLoss = summary.biggestLoss

  // Keep the exported prompt explicit and structured so another AI can use it
  // without needing any additional application context.
  const rows = positions.length
    ? positions
        .map((position, index) => {
          const shares = formatNumber(position.shares, 4)
          const lastPrice = formatAUD(position.current_price, 2)
          const avgCost = formatAUD(position.avg_cost, 2)
          const marketValue = formatAUD(position.market_value, 2)
          const weight = formatPct(position.weight_pct, 1)
          const pnl = formatSignedAUD(position.unrealized_pnl, 2)
          const pct = formatSignedPct(position.unrealized_pct, 2)

          return `| ${index + 1} | ${position.ticker ?? '--'} | ${shares} | ${lastPrice} | ${avgCost} | ${marketValue} | ${weight} | ${pnl} | ${pct} |`
        })
        .join('\n')
    : '| - | No positions found | -- | -- | -- | -- | -- | -- | -- |'

  return `You are a senior portfolio analyst reviewing an Australian brokerage snapshot.

Use only the data below. Do not invent sectors, tax details, or missing metrics. If you infer a theme or sector from a ticker, label it as an inference.

Portfolio context
- Broker: ${snapshot?.broker ?? 'Unspecified'}
- Snapshot date: ${snapshotDate}
- Currency: ${snapshot?.currency ?? 'AUD'}
- Total portfolio value: ${formatAUD(totalValue, 2)}
- Holdings: ${positions.length}
- Unrealized P&L: ${formatSignedAUD(summary.totalPnl, 2)}
- Estimated return: ${formatSignedPct(summary.returnPct, 2)}
- Largest holding: ${summary.topHolding?.ticker ?? '--'} (${formatPct(summary.topHolding?.weight_pct, 1)} of portfolio)
- Top 3 concentration: ${formatPct(summary.topThreeWeight, 1)}
- Biggest gain: ${biggestGain?.ticker ?? '--'} (${formatSignedAUD(biggestGain?.unrealized_pnl, 2)})
- Biggest loss: ${biggestLoss?.ticker ?? '--'} (${formatSignedAUD(biggestLoss?.unrealized_pnl, 2)})

Holdings table
| # | Ticker | Shares | Last price | Avg cost | Market value | Weight | Unrealized P&L | Return % |
${rows}

Please return:
1. A short executive summary.
2. Concentration and diversification analysis.
3. Position-by-position observations on what is working and what is not.
4. The main risks, missing exposures, and any obvious rebalance ideas.
5. Three follow-up questions I should ask next.

Keep the answer concise, specific, and professional.`
}
