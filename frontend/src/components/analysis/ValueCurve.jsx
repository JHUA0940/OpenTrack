import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatAUD, formatCompactAUD, formatDateAU } from '../../lib/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="chart-tooltip text-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {formatDateAU(label)}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-blue-700">
        {formatAUD(payload[0].value)}
      </p>
    </div>
  )
}

export default function ValueCurve({ data }) {
  if (!data?.length) return <EmptyChart label="No value history" />

  const first = data[0]?.total_value ?? 0
  const last = data[data.length - 1]?.total_value ?? 0
  const delta = last - first
  const positive = delta >= 0

  return (
    <section className="card px-5 py-5 sm:px-6 sm:py-6">
      <div className="panel-header mb-4">
        <div>
          <p className="eyebrow mb-2">Portfolio value</p>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
            Total portfolio value
          </h3>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Change over period</p>
          <p className={positive ? 'text-sm font-medium text-emerald-600' : 'text-sm font-medium text-rose-600'}>
            {positive ? '+' : ''}
            {formatAUD(delta)}
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
              tickFormatter={formatCompactAUD}
              width={68}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              // Keep the trend line explicit so flat periods still read as a connected series.
              type="linear"
              dataKey="total_value"
              stroke="#2563eb"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              connectNulls
              isAnimationActive={false}
              dot={{ r: 4, fill: '#ffffff', stroke: '#2563eb', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#2563eb', stroke: 'white', strokeWidth: 3 }}
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
      <p className="eyebrow mb-2">Portfolio value</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  )
}
