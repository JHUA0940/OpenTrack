import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { createUser } from './api/client'
import Navbar from './components/layout/Navbar'
import DashboardPage from './pages/DashboardPage'
import AiAnalysisPage from './pages/AiAnalysisPage'
import UploadModal from './components/upload/UploadModal'

const TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    blurb: 'Track allocation, total value, and position-level contribution.',
  },
  {
    id: 'ai',
    label: 'AI Analysis',
    blurb: 'Let Ollama review the latest holdings and keep the conversation going.',
  },
]

const DEMO_EMAIL = 'demo@opentrack.app'
const HERO_CHIPS = [
  '2-step review',
  'Screenshot OCR',
  'AUD first',
]

export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [showUpload, setShowUpload] = useState(false)
  const [userId, setUserId] = useState(null)
  const [userReady, setUserReady] = useState(false)
  const [userError, setUserError] = useState('')

  const runBootstrap = async (signal) => {
    setUserReady(false)
    setUserError('')
    try {
      const user = await createUser({ email: DEMO_EMAIL, name: 'Demo User' })
      if (signal?.aborted) return
      setUserId(user.id)
    } catch (error) {
      if (signal?.aborted) return
      console.error(error)
      setUserError('Unable to prepare the demo workspace. Check the backend and try again.')
    } finally {
      if (!signal?.aborted) setUserReady(true)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    runBootstrap(controller.signal)
    return () => controller.abort()
  }, [])

  const activeTab = TABS.find((item) => item.id === tab)
  const handleOpenUpload = () => setShowUpload(true)
  const retryUserBootstrap = () => runBootstrap()

  return (
    <div className="app-shell">
      <Navbar onUpload={handleOpenUpload} />

      <div className="app-container pt-6 sm:pt-8">
        <section className="hero-panel px-6 py-6 sm:px-8 sm:py-7 lg:px-10">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr),minmax(18rem,0.75fr)] xl:items-start">
            <div className="max-w-2xl space-y-4">
              <p className="eyebrow">OpenTrack for Australian investors</p>
              <h1 className="display-title text-balance">
                Review snapshots with a cleaner, lighter workflow.
              </h1>
              <p className="body-muted max-w-xl text-balance">
                Upload, verify, and track performance without extra noise.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {HERO_CHIPS.map((chip) => (
                  <span key={chip} className="badge badge-neutral">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="w-full max-w-md space-y-3">
              <div className="segmented-control">
                {TABS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={clsx(
                      'segmented-option flex-1 sm:flex-none',
                      tab === item.id && 'segmented-option-active'
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="card-subtle px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow">Current focus</p>
                  <div className="badge badge-soft">Live demo</div>
                </div>
                <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-slate-950">
                  {activeTab?.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {activeTab?.blurb}
                </p>
              </div>
            </div>
          </div>
        </section>

        <main className="pb-16 pt-8">
          {tab === 'dashboard' && <DashboardPage userId={userId} />}
          {tab === 'ai' && <AiAnalysisPage userId={userId} />}
        </main>
      </div>

      {showUpload && (
        <UploadModal
          userId={userId}
          isPreparingUser={!userReady}
          userError={userError}
          onRetryUser={retryUserBootstrap}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}
