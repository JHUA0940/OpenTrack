import clsx from 'clsx'

export default function ModelSelector({ models, value, onChange, disabled = false }) {
  if (!models) {
    return (
      <div className="skeleton-surface h-10 rounded-2xl" />
    )
  }

  const allOptions = buildOptions(models)
  const ollamaOptions = models.ollama || []

  return (
    <div>
      <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">
        OCR Model
      </label>
      <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
        {allOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            disabled={disabled}
            className={clsx(
              'flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm transition',
              value === opt.id
                ? 'border-blue-200 bg-blue-50 text-slate-950'
                : 'border-slate-200 bg-white/75 text-slate-700 hover:border-slate-300 hover:text-slate-950',
              disabled && 'cursor-not-allowed opacity-60'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{opt.icon}</span>
              <span className="truncate font-medium">{opt.label}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {opt.vision && (
                <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-xs">Vision</span>
              )}
              {opt.tag && (
                <span className="badge bg-slate-100 text-slate-500 text-xs">{opt.tag}</span>
              )}
              {value === opt.id && (
                <span className="text-blue-600 text-xs font-medium">Selected</span>
              )}
            </div>
          </button>
        ))}
      </div>
      {ollamaOptions.length === 0 && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          No Ollama models were found. Make sure Ollama is running and
          <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700">OLLAMA_BASE_URL</code>
          is reachable from the backend container.
        </p>
      )}
    </div>
  )
}

function buildOptions(models) {
  const opts = []

  // Auto (uses server default)
  opts.push({
    id: 'auto',
    label: 'Auto (server default)',
    icon: '⚙️',
    vision: false,
    tag: null,
  })

  // Builtin backends
  for (const m of models.builtin || []) {
    opts.push({
      id: m.id,
      label: m.label,
      icon: '🔤',
      vision: m.vision,
      tag: 'Local',
    })
  }

  // Ollama models
  for (const m of models.ollama || []) {
    opts.push({
      id: m.id,
      label: m.label,
      icon: '🦙',
      vision: m.vision,
      tag: 'Ollama',
    })
  }

  return opts
}
