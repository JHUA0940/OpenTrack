import { useState } from 'react'
import ReturnCurve from '../components/analysis/ReturnCurve'
import TimeFilter from '../components/analysis/TimeFilter'
import ValueCurve from '../components/analysis/ValueCurve'
import { useReturnsHistory, useValueHistory } from '../hooks/useHistory'

export default function AnalysisPage({ userId }) {
  const [period, setPeriod] = useState('ALL')

  const { data: valueData, isLoading: valueLoading } = useValueHistory(userId, period)
  const { data: returnData, isLoading: returnLoading } = useReturnsHistory(userId, period)

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="panel-header gap-4">
        <div>
          <p className="eyebrow mb-2">Analysis</p>
          <h2 className="section-title">Performance over time</h2>
          <p className="body-muted mt-2 max-w-2xl">
            Compare the latest trend lines across saved snapshots without losing the
            lightweight feel of the dashboard.
          </p>
        </div>

        <TimeFilter value={period} onChange={setPeriod} />
      </section>

      <div className="grid gap-6">
        {valueLoading ? <ChartSkeleton /> : <ValueCurve data={valueData} />}
        {returnLoading ? <ChartSkeleton /> : <ReturnCurve data={returnData} />}
      </div>
    </div>
  )
}

function ChartSkeleton() {
  return <div className="skeleton-surface h-[22rem]" />
}
