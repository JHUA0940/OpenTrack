import { formatAUD, formatDateAU, formatSignedAUD } from '../../lib/formatters'
import { summarizePortfolio } from '../../lib/portfolio'

export default function PortfolioSummary({ snapshot }) {
  if (!snapshot) return null

  const positions = snapshot.positions ?? []
  const { totalPnl, returnPct } = summarizePortfolio(positions)
  const hasPnl = positions.length > 0

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="card relative overflow-hidden px-6 py-6 md:col-span-2 xl:col-span-2">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-blue-100/90 via-white/10 to-transparent" />
        <div className="relative flex h-full flex-col justify-between gap-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">Latest snapshot</p>
            <p className="metric-value">{formatAUD(snapshot.total_value)}</p>
          </div>
          <div className="badge bg-white/80 text-slate-600 ring-1 ring-slate-200/80">
            {positions.length} holdings
          </div>
        </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetaStat label="Broker" value={snapshot.broker ?? 'Unspecified'} />
            <MetaStat
              label="As of"
              value={formatDateAU(snapshot.snapshot_date)}
            />
          </div>
        </div>
      </div>

      <SummaryCard label="Total return">
        {hasPnl ? (
          <>
            <p className={`metric-value text-[2.2rem] sm:text-[2.45rem] ${toneClass(totalPnl)}`}>
              {formatSignedAUD(totalPnl)}
            </p>
            {returnPct != null && (
              <p className={`mt-2 text-sm font-medium ${toneClass(returnPct)}`}>
                {returnPct >= 0 ? '+' : ''}
                {returnPct.toFixed(2)}%
              </p>
            )}
          </>
        ) : (
          <p className="metric-value text-slate-300">--</p>
        )}
      </SummaryCard>

      <SummaryCard label="Portfolio mix">
        <p className="metric-value text-[2.2rem] sm:text-[2.45rem]">
          {positions.length || 0}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Distinct positions in the latest upload
        </p>
      </SummaryCard>
    </div>
  )
}

function SummaryCard({ label, children }) {
  return (
    <div className="card px-6 py-6">
      <p className="eyebrow mb-4">{label}</p>
      {children}
    </div>
  )
}

function MetaStat({ label, value }) {
  return (
    <div className="card-subtle px-4 py-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold tracking-[-0.02em] text-slate-900">
        {value}
      </p>
    </div>
  )
}

function toneClass(value) {
  if (value > 0) return 'text-emerald-600'
  if (value < 0) return 'text-rose-600'
  return 'text-slate-900'
}
