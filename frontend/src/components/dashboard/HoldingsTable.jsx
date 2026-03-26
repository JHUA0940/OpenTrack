import clsx from 'clsx'
import { formatAUD, formatNumber, formatPct, formatSignedAUD } from '../../lib/formatters'
import { summarizePortfolio } from '../../lib/portfolio'

export default function HoldingsTable({ positions }) {
  if (!positions?.length) return null

  const {
    ordered: sorted,
    totalPnl,
    positiveCount,
    negativeCount,
    topThreeWeight,
  } = summarizePortfolio(positions)
  const leadPosition = sorted[0]

  return (
    <section className="card px-5 py-5 sm:px-6 sm:py-6">
      <div className="panel-header mb-4">
        <div>
          <p className="eyebrow mb-2">Holdings</p>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">Position list</h3>
          <p className="body-muted mt-2 max-w-xl">
            Exact market value and return details, sorted by size for quick scanning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="badge badge-neutral">{sorted.length} positions</div>
          <div className="badge badge-soft">Sorted by market value</div>
        </div>
      </div>

      <div className="holdings-summary-grid">
        <SummaryCard
          label="Largest holding"
          value={leadPosition?.ticker ?? '--'}
          detail={
            leadPosition
              ? `${formatPct(leadPosition.weight_pct)} · ${formatAUD(leadPosition.market_value)}`
              : '--'
          }
        />
        <SummaryCard
          label="Net P&L"
          value={formatSignedAUD(totalPnl)}
          detail="Across all positions"
          tone={totalPnl > 0 ? 'positive' : totalPnl < 0 ? 'negative' : 'neutral'}
        />
        <SummaryCard
          label="Winners / losers"
          value={`${positiveCount} / ${negativeCount}`}
          detail="Names with marked returns"
        />
        <SummaryCard
          label="Top 3 concentration"
          value={formatPct(topThreeWeight)}
          detail="Share of portfolio value"
        />
      </div>

      <div className="mt-4 hidden px-4 pb-2 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] lg:gap-6">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Holding
        </div>
        <div className="text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Value
        </div>
        <div className="text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Weight
        </div>
        <div className="text-right text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          P&amp;L
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {sorted.map((position, index) => {
          const pnl = Number(position.unrealized_pnl ?? 0)
          const pct = position.unrealized_pct
          const positive = pnl > 0
          const negative = pnl < 0
          const shares = Number(position.shares ?? 0)
          // The broker snapshot does not always give us average cost directly, so
          // derive it from value and unrealized P&L when the inputs are available.
          const avgCost =
            shares > 0 && position.unrealized_pnl != null
              ? (Number(position.market_value ?? 0) - pnl) / shares
              : null

          return (
            <div key={`${position.ticker}-${index}`} className="allocation-row">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] lg:items-center lg:gap-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="holdings-row-rank">{String(index + 1).padStart(2, '0')}</div>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950">
                      {position.ticker}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span>{formatNumber(position.shares)} shares</span>
                      <span>Last {formatAUD(position.current_price)}</span>
                      <span>Avg cost {avgCost != null ? formatAUD(avgCost) : '--'}</span>
                    </div>
                  </div>
                </div>

                <div className="holdings-row-metric text-left lg:text-right">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:hidden">
                    Value
                  </p>
                  <p className="mt-0 font-semibold tracking-[-0.02em] text-slate-950 tabular-nums">
                    {formatAUD(position.market_value)}
                  </p>
                </div>

                <div className="holdings-row-metric text-left lg:text-right">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:hidden">
                    Weight
                  </p>
                  <div className="mt-1 lg:mt-0">
                    <span className="holdings-weight-pill">
                      {position.weight_pct?.toFixed(1) ?? '0.0'}%
                    </span>
                  </div>
                </div>

                <div className="holdings-row-metric text-left lg:text-right">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 lg:hidden">
                    P&amp;L
                  </p>
                  {position.unrealized_pnl != null ? (
                    <div
                      className={clsx(
                        'mt-1 leading-tight tabular-nums lg:mt-0',
                        positive && 'text-emerald-600',
                        negative && 'text-rose-600',
                        !positive && !negative && 'text-slate-500'
                      )}
                    >
                      <div className="font-medium">
                        {positive ? '+' : ''}
                        {formatAUD(pnl)}
                      </div>
                      {pct != null && (
                        <div className="mt-1 text-xs font-medium opacity-80">
                          {pct > 0 ? '+' : ''}
                          {pct.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="mt-1 inline-block text-slate-400 lg:mt-0">--</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SummaryCard({ label, value, detail, tone = 'neutral' }) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-rose-600'
        : 'text-slate-950'

  return (
    <div className="holdings-summary-card">
      <p className="allocation-stat-label">{label}</p>
      <p className={`mt-3 text-lg font-semibold tracking-[-0.03em] tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
    </div>
  )
}
