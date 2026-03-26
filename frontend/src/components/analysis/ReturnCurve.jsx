import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatAUD, formatDateAU } from '../../lib/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  const datum = payload[0].payload
  const positive = (datum.return_pct ?? 0) >= 0

  return (
    <div className="chart-tooltip text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {formatDateAU(label)}
      </p>
      <p className={positive ? 'mt-2 text-lg font-semibold tracking-[-0.03em] text-emerald-600' : 'mt-2 text-lg font-semibold tracking-[-0.03em] text-rose-600'}>
        {positive ? '+' : ''}
        {(datum.return_pct ?? 0).toFixed(2)}%
      </p>
      {datum.return_amount != null && (
        <p className={positive ? 'mt-1 text-sm font-medium text-emerald-600/80' : 'mt-1 text-sm font-medium text-rose-600/80'}>
          {positive ? '+' : ''}
          {formatAUD(datum.return_amount)}
        </p>
      )}
    </div>
  )
}

export default function ReturnCurve({ data }) {
  if (!data?.length) return <EmptyChart label="No return history" />

  const latest = data[data.length - 1]
  const latestPct = latest?.return_pct ?? 0
  const latestAmount = latest?.return_amount ?? null
  const positive = latestPct >= 0
  const stroke = positive ? '#0f9f6e' : '#e11d48'

  return (
    <section className="card px-5 py-5 sm:px-6 sm:py-6">
      <div className="panel-header mb-4">
        <div>
          <p className="eyebrow mb-2">Return</p>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
            Total return
          </h3>
          {data.length === 1 && (
            <p className="mt-2 text-sm text-slate-500">
              Add more snapshots to show a full trend line.
            </p>
          )}
        </div>

        <div className="text-right">
          {latestAmount != null && (
            <p className={positive ? 'text-lg font-semibold tracking-[-0.03em] text-emerald-600' : 'text-lg font-semibold tracking-[-0.03em] text-rose-600'}>
              {positive ? '+' : ''}
              {formatAUD(latestAmount, 0)}
            </p>
          )}
          <p className={positive ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-rose-600'}>
            {positive ? '+' : ''}
            {latestPct.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="h-[18rem] sm:h-[20rem]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148,163,184,0.18)" vertical={false} />
            <XAxis
              axisLine={false}
              tickLine={false}
              dataKey="date"
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(date) => formatDateAU(date, { month: 'short', day: 'numeric' })}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              tickFormatter={(value) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`}
              width={62}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="rgba(100,116,139,0.35)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="return_pct"
              stroke={stroke}
              strokeWidth={3}
              dot={data.length === 1 ? { r: 5, fill: stroke, strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: stroke, stroke: 'white', strokeWidth: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="empty-state min-h-[18rem]">
      <p className="eyebrow mb-2">Return</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}
