import { formatAUD, formatDateAU, formatSignedAUD } from '../../lib/formatters'
import { summarizePortfolio } from '../../lib/portfolio'

export default function PortfolioSummary({ snapshot }) {
  if (!snapshot) return null

  const positions = snapshot.positions ?? []
  const { totalPnl, returnPct } = summarizePortfolio(positions)
  const hasPnl = positions.length > 0

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* ── Main snapshot card ─────────────────────────────── */}
      <div className="card relative overflow-hidden px-7 py-7 md:col-span-2 xl:col-span-2">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-blue-100/90 via-white/10 to-transparent" />
        <div className="relative flex h-full flex-col justify-between gap-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow mb-3">Latest snapshot</p>
              {/* Split $ symbol so it doesn't visually merge with the digits */}
              <SplitAmount value={formatAUD(snapshot.total_value)} size="lg" />
            </div>
            <div className="badge bg-white/80 text-slate-600 ring-1 ring-slate-200/80">
              {positions.length} holdings
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetaStat label="Broker" value={snapshot.broker ?? 'Unspecified'} />
            <MetaStat label="As of" value={formatDateAU(snapshot.snapshot_date)} />
          </div>
        </div>
      </div>

      {/* ── Total return ───────────────────────────────────── */}
      <SummaryCard label="Total return">
        {hasPnl ? (
          <div className="flex flex-col gap-3">
            <SplitAmount value={formatSignedAUD(totalPnl)} tone={toneOf(totalPnl)} />
            {returnPct != null && (
              <ReturnBadge value={returnPct} />
            )}
          </div>
        ) : (
          <span className="metric-value text-slate-300">--</span>
        )}
      </SummaryCard>

      {/* ── Portfolio mix ──────────────────────────────────── */}
      <SummaryCard label="Portfolio mix">
        <div className="flex flex-col gap-3">
          <p className="text-[2.6rem] font-semibold leading-none tracking-[-0.01em] text-slate-950 tabular-nums">
            {positions.length || 0}
          </p>
          <p className="text-sm leading-5 text-slate-500">
            Distinct positions in the latest upload
          </p>
        </div>
      </SummaryCard>
    </div>
  )
}

/**
 * Renders a dollar amount with a smaller, slightly muted currency prefix
 * so the digits themselves stand out and don't feel crammed.
 *
 * e.g.  "$69,248.97"  →  <span>$</span><span>69,248.97</span>
 *       "-$608.14"    →  <span>-$</span><span>608.14</span>
 */
function SplitAmount({ value, tone, size = 'md' }) {
  const str = String(value ?? '--')
  const match = str.match(/^(-?\$?)(.*)$/)
  const prefix = match?.[1] ?? ''
  const digits = match?.[2] ?? str

  const toneClass = tone === 'positive'
    ? 'text-emerald-600'
    : tone === 'negative'
      ? 'text-rose-600'
      : 'text-slate-950'

  const numSize = size === 'lg'
    ? 'text-[2.15rem] sm:text-[2.5rem]'
    : 'text-[1.85rem] sm:text-[2.1rem]'

  return (
    <span className={`flex items-baseline gap-0.5 tabular-nums ${toneClass}`}>
      <span className={`${size === 'lg' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'} font-medium opacity-60`}>
        {prefix}
      </span>
      <span className={`${numSize} font-semibold leading-none tracking-[-0.02em]`}>
        {digits}
      </span>
    </span>
  )
}

function ReturnBadge({ value }) {
  const positive = value > 0
  const negative = value < 0
  const sign = positive ? '+' : ''
  const colorClass = positive
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/60'
    : negative
      ? 'bg-rose-50 text-rose-700 ring-rose-200/60'
      : 'bg-slate-100 text-slate-600 ring-slate-200/60'

  return (
    <span className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums ring-1 ${colorClass}`}>
      {sign}{value.toFixed(2)}%
    </span>
  )
}

function SummaryCard({ label, children }) {
  return (
    <div className="card px-7 py-7">
      <p className="eyebrow mb-5">{label}</p>
      {children}
    </div>
  )
}

function MetaStat({ label, value }) {
  return (
    <div className="card-subtle px-4 py-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-[0.95rem] font-semibold tracking-[-0.01em] text-slate-900">
        {value}
      </p>
    </div>
  )
}

function toneOf(value) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}
