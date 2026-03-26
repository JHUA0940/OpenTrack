import { useState } from 'react'
import HoldingsPieChart from '../components/dashboard/HoldingsPieChart'
import HoldingsTable from '../components/dashboard/HoldingsTable'
import PortfolioSummary from '../components/dashboard/PortfolioSummary'
import ReturnCurve from '../components/analysis/ReturnCurve'
import TimeFilter from '../components/analysis/TimeFilter'
import ValueCurve from '../components/analysis/ValueCurve'
import { useReturnsHistory, useValueHistory } from '../hooks/useHistory'
import { useCurrentPortfolio } from '../hooks/usePortfolio'

export default function DashboardPage({ userId }) {
  const [period, setPeriod] = useState('ALL')
  const { data: snapshot, isLoading, isError } = useCurrentPortfolio(userId)
  const { data: valueData, isLoading: valueLoading } = useValueHistory(userId, period)
  const { data: returnData, isLoading: returnLoading } = useReturnsHistory(userId, period)

  if (isLoading) return <Skeleton />
  if (isError) return <Empty />

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="panel-header">
        <div>
          <p className="eyebrow mb-2">Dashboard</p>
          <h2 className="section-title">Portfolio at a glance</h2>
          <p className="body-muted mt-2 max-w-2xl">
            The latest confirmed snapshot, simplified into a cleaner overview of value,
            allocation, and individual position impact.
          </p>
        </div>
      </section>

      <PortfolioSummary snapshot={snapshot} />

      <div className="space-y-6">
        <HoldingsPieChart positions={snapshot?.positions} />
        <HoldingsTable positions={snapshot?.positions} />
      </div>

      <section className="space-y-6">
        <div className="panel-header gap-4">
          <div>
            <p className="eyebrow mb-2">Performance</p>
            <h2 className="section-title">Value and return trends</h2>
            <p className="body-muted mt-2 max-w-2xl">
              The same time-series view is now embedded below the dashboard, so you can
              read the snapshot and trend context in one place.
            </p>
          </div>

          <TimeFilter value={period} onChange={setPeriod} />
        </div>

        <div className="grid gap-6">
          {valueLoading ? <ChartSkeleton /> : <ValueCurve data={valueData} />}
          {returnLoading ? <ChartSkeleton /> : <ReturnCurve data={returnData} />}
        </div>
      </section>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-3">
        <div className="skeleton-surface h-4 w-24" />
        <div className="skeleton-surface h-11 w-72 max-w-full" />
        <div className="skeleton-surface h-5 w-[32rem] max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="skeleton-surface h-36" />
        ))}
      </div>

      <div className="space-y-6">
        <div className="skeleton-surface h-[20rem]" />
        <div className="skeleton-surface h-[28rem]" />
      </div>
    </div>
  )
}

function Empty() {
  return (
    <div className="empty-state">
      <p className="eyebrow mb-2">Dashboard</p>
      <h2 className="section-title">No portfolio data yet</h2>
      <p className="body-muted mt-3 max-w-md">
        Upload a brokerage screenshot to generate your first confirmed snapshot and
        populate the dashboard.
      </p>
    </div>
  )
}

function ChartSkeleton() {
  return <div className="skeleton-surface h-[22rem]" />
}
