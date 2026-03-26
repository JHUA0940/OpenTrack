import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  formatAUD,
  formatPct,
  formatSignedAUD,
  formatSignedCompactAUD,
} from '../../lib/formatters'
import { summarizePortfolio } from '../../lib/portfolio'

const COLORS = [
  '#2563eb',
  '#4f46e5',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#0ea5e9',
  '#14b8a6',
]

export default function HoldingsPieChart({ positions }) {
  if (!positions?.length) return null

  const {
    ordered,
    totalValue,
    totalPnl,
    returnPct,
    topHolding,
    topThreeWeight,
    positiveCount,
    negativeCount,
    gainTotal,
    lossTotal,
    pnlBound,
  } = summarizePortfolio(positions)

  const chartData = ordered.map((position, index) => {
    const marketValue = Number(position.market_value ?? 0)
    const weight = Number(
      position.weight_pct ?? (totalValue ? (marketValue / totalValue) * 100 : 0)
    )

    return {
      ...position,
      name: position.ticker ?? `Holding ${index + 1}`,
      value: marketValue,
      weight,
      color: COLORS[index % COLORS.length],
    }
  })

  const pnlSplitData = ordered
    .map((position) => {
      const pnl = Number(position.unrealized_pnl ?? 0)

      return {
        name: position.ticker ?? '--',
        pnl,
        pnlPct: position.unrealized_pct,
        color: pnl >= 0 ? '#0f9f6e' : '#d14343',
      }
    })
    .sort((left, right) => {
      if ((left.pnl >= 0) !== (right.pnl >= 0)) {
        return left.pnl >= 0 ? -1 : 1
      }

      const diff = Math.abs(right.pnl) - Math.abs(left.pnl)
      if (diff !== 0) return diff
      return right.pnl - left.pnl
    })

  return (
    <section className="card px-5 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="allocation-header-icons" aria-hidden="true">
              <span className="allocation-header-icon allocation-header-icon-blue">
                <PieGlyph />
              </span>
              <span className="allocation-header-icon allocation-header-icon-indigo">
                <BarsGlyph />
              </span>
            </div>

            <div className="min-w-0">
              <p className="eyebrow mb-2">Allocation</p>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Asset distribution
              </h3>
              <p className="body-muted mt-2 max-w-2xl">
                A compact read on concentration and leading positions before you scan the
                list below.
              </p>
            </div>
          </div>

          <div className="badge badge-neutral">{ordered.length} positions</div>
        </div>

        <div className="allocation-stat-grid">
          <StatTile label="Total value" value={formatAUD(totalValue, 0)} note="Latest confirmed snapshot" />
          <StatTile
            label="Net P&L"
            value={formatSignedAUD(totalPnl, 0)}
            note={
              returnPct != null
                ? `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}% return`
                : 'No return data'
            }
            tone={totalPnl > 0 ? 'positive' : totalPnl < 0 ? 'negative' : 'neutral'}
          />
          <StatTile
            label="Top holding"
            value={topHolding?.ticker ?? '--'}
            note={
              topHolding
                ? `${formatPct(topHolding.weight_pct)} · ${formatAUD(topHolding.market_value, 0)}`
                : '--'
            }
          />
          <StatTile
            label="Holdings"
            value={`${ordered.length}`}
            note={`${formatPct(topThreeWeight)} top 3 concentration`}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
          <div className="card-subtle flex h-full flex-col px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="allocation-section-label">Portfolio mix</p>
              <div className="badge badge-neutral">Donut</div>
            </div>

            <div className="mt-4 flex flex-1 items-center justify-center">
              <div className="allocation-ring-shell relative w-full max-w-[28rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="58%"
                      outerRadius="84%"
                      paddingAngle={2}
                      cornerRadius={8}
                      stroke="rgba(255, 255, 255, 0.92)"
                      strokeWidth={2}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="allocation-donut-center">
                  <p className="allocation-donut-label">HOLDINGS</p>
                  <p className="allocation-donut-value">{ordered.length}</p>
                  <p className="allocation-donut-subvalue">{formatAUD(totalValue, 0)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-subtle flex h-full flex-col px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="allocation-section-label">P&amp;L split</p>
              <div className="badge badge-soft">Gain / Loss</div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em]">
              <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-600">
                Losses {negativeCount} · {formatSignedAUD(lossTotal, 0)}
              </span>
              <span className="h-px flex-1 bg-slate-200/80" />
              <span className="rounded-full bg-white px-3 py-1 text-slate-500">0</span>
              <span className="h-px flex-1 bg-slate-200/80" />
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-600">
                Gains {positiveCount} · {formatSignedAUD(gainTotal, 0)}
              </span>
            </div>

            <div className="mt-4 flex-1 min-h-[24rem]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pnlSplitData}
                  layout="vertical"
                  margin={{ top: 16, right: 16, left: 0, bottom: 12 }}
                  barCategoryGap="22%"
                >
                  {/* Shade the two halves so the zero line reads instantly. */}
                  <ReferenceArea x1={-pnlBound} x2={0} fill="rgba(239, 68, 68, 0.05)" />
                  <ReferenceArea x1={0} x2={pnlBound} fill="rgba(16, 185, 129, 0.05)" />
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" horizontal={false} />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickFormatter={(value) => formatSignedCompactAUD(value)}
                    domain={[-pnlBound, pnlBound]}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    width={62}
                  />
                  <ReferenceLine x={0} stroke="rgba(100, 116, 139, 0.55)" strokeWidth={1} />
                  <Tooltip content={<PnlSplitTooltip />} />
                  <Bar dataKey="pnl" radius={6} maxBarSize={24}>
                    {pnlSplitData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="allocation-section-label">Holding mix</p>
            <p className="text-xs font-medium text-slate-500">
              Sized by market value, ordered by concentration
            </p>
          </div>

          <div className="allocation-legend-list mt-3">
            {chartData.map((entry) => (
              <div key={entry.name} className="allocation-legend-pill">
                <span
                  className="allocation-legend-swatch"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium tracking-[-0.01em] text-slate-700">
                    {entry.name}
                  </span>
                  <span className="block text-xs text-slate-500">{formatPct(entry.weight)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="concentration-meter w-full max-w-5xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Top 3 concentration
            </p>
            <p className="text-sm font-semibold tracking-[-0.02em] text-slate-900">
              {formatPct(topThreeWeight)}
            </p>
          </div>
          <div className="allocation-meter-track mt-3">
            <div
              className="allocation-meter-fill"
              style={{ width: `${Math.min(topThreeWeight, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            The three largest positions account for most of the portfolio mix.
          </p>
        </div>
      </div>
    </section>
  )
}

function StatTile({ label, value, note, tone = 'neutral' }) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'negative'
        ? 'text-rose-600'
        : 'text-slate-900'

  return (
    <div className="allocation-stat">
      <p className="allocation-stat-label">{label}</p>
      <p className={`mt-3 text-[1.55rem] font-semibold tracking-[-0.04em] tabular-nums ${toneClass}`}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
    </div>
  )
}

function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const entry = payload[0].payload

  return (
    <div className="chart-tooltip">
      <p className="eyebrow">Holding</p>
      <p className="mt-1 text-base font-semibold tracking-[-0.02em] text-slate-900">
        {entry.name}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {formatAUD(entry.value, 2)} · {formatPct(entry.weight)}
      </p>
    </div>
  )
}

function PnlSplitTooltip({ active, payload }) {
  if (!active || !payload?.length) return null

  const entry = payload[0].payload

  return (
    <div className="chart-tooltip">
      <p className="eyebrow">P&amp;L split</p>
      <p className="mt-1 text-base font-semibold tracking-[-0.02em] text-slate-900">
        {entry.name}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        {formatSignedAUD(entry.pnl, 2)}
        {entry.pnlPct != null && ` · ${entry.pnlPct > 0 ? '+' : ''}${entry.pnlPct.toFixed(2)}%`}
      </p>
    </div>
  )
}

function PieGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="allocation-header-icon-svg" fill="none" aria-hidden="true">
      <path
        d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5h-8.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.5v8.5h8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BarsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="allocation-header-icon-svg" fill="none" aria-hidden="true">
      <path
        d="M5.5 16.5V12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.5 16.5V8.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15.5 16.5v-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4.5 17.5h15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
