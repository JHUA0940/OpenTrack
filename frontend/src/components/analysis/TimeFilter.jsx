import clsx from 'clsx'

const PERIODS = ['1M', '3M', '1Y', 'ALL']

export default function TimeFilter({ value, onChange }) {
  return (
    <div className="segmented-control">
      {PERIODS.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={clsx(
            'segmented-option min-w-[3.4rem] flex-1 sm:flex-none',
            value === period && 'segmented-option-active'
          )}
        >
          {period}
        </button>
      ))}
    </div>
  )
}
