import { useState } from 'react'
import clsx from 'clsx'

export default function ConfirmationStep({ ocrResult, onConfirm, onBack, loading }) {
  const [positions, setPositions] = useState(
    ocrResult.positions.map(p => ({ ...p }))
  )
  const [totalValue, setTotalValue] = useState(ocrResult.total_value ?? '')
  const [broker, setBroker] = useState(ocrResult.broker ?? '')
  const [snapshotDate, setSnapshotDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const updatePosition = (i, field, value) => {
    setPositions(prev => prev.map((p, idx) =>
      idx === i ? { ...p, [field]: value === '' ? null : Number(value) || value } : p
    ))
  }

  const addRow = () =>
    setPositions(prev => [...prev, { ticker: '', shares: null, current_price: null, market_value: 0 }])

  const removeRow = (i) =>
    setPositions(prev => prev.filter((_, idx) => idx !== i))

  const handleConfirm = () => {
    onConfirm({
      snapshot_date: snapshotDate,
      total_value: parseFloat(totalValue),
      broker: broker || null,
      currency: ocrResult.currency,
      ocr_confidence: ocrResult.confidence,
      image_path: ocrResult.image_path,
      positions: positions.filter(p => p.ticker && p.market_value),
    })
  }

  const confidenceColor =
    ocrResult.confidence >= 0.8 ? 'text-emerald-600' :
    ocrResult.confidence >= 0.5 ? 'text-amber-500' : 'text-rose-600'

  return (
    <div className="space-y-5">
      <div className="card-subtle flex items-center gap-2 rounded-2xl p-3 text-sm">
        <span className="text-slate-500">OCR Confidence:</span>
        <span className={clsx('font-semibold', confidenceColor)}>
          {(ocrResult.confidence * 100).toFixed(0)}%
        </span>
        {ocrResult.confidence < 0.6 && (
          <span className="ml-auto text-xs text-amber-600">Please review carefully</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="field-label">Date</label>
          <input
            type="date"
            value={snapshotDate}
            onChange={e => setSnapshotDate(e.target.value)}
            className="input-shell"
          />
        </div>
        <div>
          <label className="field-label">Total Value (AUD)</label>
          <input
            type="number"
            value={totalValue}
            onChange={e => setTotalValue(e.target.value)}
            className="input-shell"
          />
        </div>
        <div>
          <label className="field-label">Broker</label>
          <input
            type="text"
            value={broker}
            onChange={e => setBroker(e.target.value)}
            placeholder="e.g. Stake"
            className="input-shell"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="pb-2 px-2 text-left font-medium text-slate-500">Ticker</th>
              <th className="pb-2 px-2 text-right font-medium text-slate-500">Shares</th>
              <th className="pb-2 px-2 text-right font-medium text-slate-500">Price</th>
              <th className="pb-2 px-2 text-right font-medium text-slate-500">Mkt Value</th>
              <th className="pb-2 px-2 text-right font-medium text-slate-500">Return $</th>
              <th className="pb-2 px-2 text-right font-medium text-slate-500">Return %</th>
              <th className="pb-2 px-2" />
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => (
              <tr key={i} className="border-b border-slate-100">
                {['ticker', 'shares', 'current_price', 'market_value', 'unrealized_pnl', 'unrealized_pct'].map(field => (
                  <td key={field} className={clsx('py-1.5 px-1', field !== 'ticker' && 'text-right')}>
                    <input
                      type={field === 'ticker' ? 'text' : 'number'}
                      value={p[field] ?? ''}
                      onChange={e => updatePosition(i, field, e.target.value)}
                      className={clsx(
                        'w-full rounded-xl border border-slate-200 bg-white/85 px-2 py-1.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none',
                        field === 'ticker' ? 'text-left' : 'text-right',
                        field === 'unrealized_pnl' && p[field] < 0 && 'text-rose-600',
                        field === 'unrealized_pnl' && p[field] > 0 && 'text-emerald-600',
                      )}
                    />
                  </td>
                ))}
                <td className="py-1.5 px-1">
                  <button onClick={() => removeRow(i)} className="text-slate-400 transition-colors hover:text-rose-600">X</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button onClick={addRow} className="text-sm text-blue-600 transition-colors hover:text-blue-700">
        + Add row
      </button>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-secondary flex-1" disabled={loading}>
          Re-upload
        </button>
        <button onClick={handleConfirm} className="btn-primary flex-1" disabled={loading || !positions.length}>
          {loading ? 'Saving…' : 'Confirm & Save'}
        </button>
      </div>
    </div>
  )
}
