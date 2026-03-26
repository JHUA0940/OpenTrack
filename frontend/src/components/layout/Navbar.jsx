export default function Navbar({ onUpload }) {
  return (
    <header className="app-container sticky top-0 z-40 pt-4">
      <nav className="glass-panel flex items-center justify-between gap-4 rounded-[1.75rem] px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="brand-mark">
            OT
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-lg font-semibold tracking-[-0.03em] text-slate-950">
                OpenTrack
              </span>
              <span className="badge badge-soft">AUS</span>
              <span className="badge badge-neutral hidden sm:inline-flex">Screenshot workflow</span>
            </div>
            <p className="hidden text-sm text-slate-500 lg:block">
              A calmer interface for local broker statements, historical curves, and upload review.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="status-pill hidden xl:flex">
            <span className="status-pill-dot" />
            Ready for a new snapshot
          </div>

          <button onClick={onUpload} className="btn-primary shrink-0">
            <span className="text-base leading-none">+</span>
            Upload snapshot
          </button>
        </div>
      </nav>
    </header>
  )
}
