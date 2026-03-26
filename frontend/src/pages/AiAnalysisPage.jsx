import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import clsx from 'clsx'
import { portfolioChat } from '../api/client'
import { formatAUD, formatDateAU, formatPct, formatSignedAUD } from '../lib/formatters'
import { summarizePortfolio } from '../lib/portfolio'
import { buildShareablePrompt } from '../lib/portfolioPrompt'
import { useCurrentPortfolio } from '../hooks/usePortfolio'

const STARTER_PROMPTS = [
  'Where is the portfolio most concentrated right now?',
  'What are the biggest risks in this mix?',
  'How diversified does this look by theme and exposure?',
]

export default function AiAnalysisPage({ userId }) {
  const { data: snapshot, isLoading, isError } = useCurrentPortfolio(userId)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [requestError, setRequestError] = useState('')
  const [shareablePrompt, setShareablePrompt] = useState('')
  const [promptStatus, setPromptStatus] = useState('idle')
  const [pendingQuestion, setPendingQuestion] = useState('')
  const [bootstrappedSnapshotId, setBootstrappedSnapshotId] = useState(null)
  const threadRef = useRef(null)
  const promptStatusTimerRef = useRef(null)

  const chatMutation = useMutation({
    mutationFn: (payload) => portfolioChat(payload),
    onSuccess: (response) => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.reply,
          model: response.model,
          asOf: response.as_of,
        },
      ])
      setPendingQuestion('')
      setRequestError('')
    },
    onError: (error) => {
      setPendingQuestion('')
      setRequestError(readError(error, 'AI analysis is unavailable right now.'))
    },
  })

  useEffect(() => {
    setMessages([])
    setDraft('')
    setRequestError('')
    setShareablePrompt('')
    setPromptStatus('idle')
    setPendingQuestion('')
    setBootstrappedSnapshotId(null)

    if (promptStatusTimerRef.current) {
      window.clearTimeout(promptStatusTimerRef.current)
      promptStatusTimerRef.current = null
    }
  }, [snapshot?.id])

  useEffect(
    () => () => {
      if (promptStatusTimerRef.current) {
        window.clearTimeout(promptStatusTimerRef.current)
      }
    },
    []
  )

  useEffect(() => {
    if (!snapshot?.id || !userId || bootstrappedSnapshotId === snapshot.id) return
    if (chatMutation.isPending) return

    setBootstrappedSnapshotId(snapshot.id)
    submitQuestion('')
  }, [bootstrappedSnapshotId, chatMutation.isPending, snapshot?.id, userId])

  useEffect(() => {
    if (!threadRef.current) return
    threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [messages, pendingQuestion, requestError])

  if (!userId || isLoading) return <Skeleton />
  if (isError || !snapshot) return <Empty />

  const summary = summarizePortfolio(snapshot.positions ?? [])
  const orderedPositions = summary.ordered
  const topPositions = orderedPositions.slice(0, 4)

  function submitQuestion(rawQuestion) {
    if (!userId || chatMutation.isPending) return

    const question = rawQuestion.trim()
    const history = messages.map(({ role, content }) => ({ role, content }))

    if (question) {
      setMessages((current) => [
        ...current,
        { id: `user-${Date.now()}`, role: 'user', content: question },
      ])
    }

    setPendingQuestion(question)
    setRequestError('')
    chatMutation.mutate({
      user_id: userId,
      question: question || undefined,
      history,
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!draft.trim()) return
    const next = draft
    setDraft('')
    submitQuestion(next)
  }

  function handleRefreshAnalysis() {
    if (!userId || chatMutation.isPending) return
    setMessages([])
    setRequestError('')
    setPendingQuestion('')
    chatMutation.mutate({
      user_id: userId,
      question: 'Give me a fresh summary of the current portfolio.',
      history: [],
    })
  }

  function flashPromptStatus(nextStatus) {
    setPromptStatus(nextStatus)

    if (promptStatusTimerRef.current) {
      window.clearTimeout(promptStatusTimerRef.current)
    }

    if (nextStatus === 'copied' || nextStatus === 'failed') {
      promptStatusTimerRef.current = window.setTimeout(() => {
        setPromptStatus('idle')
      }, 2200)
    }
  }

  async function handleGeneratePrompt() {
    if (!snapshot) return

    const prompt = buildShareablePrompt(snapshot, summary)
    setShareablePrompt(prompt)

    try {
      await copyTextToClipboard(prompt)
      flashPromptStatus('copied')
    } catch {
      flashPromptStatus('failed')
    }
  }

  async function handleCopyPrompt() {
    if (!shareablePrompt) {
      await handleGeneratePrompt()
      return
    }

    try {
      await copyTextToClipboard(shareablePrompt)
      flashPromptStatus('copied')
    } catch {
      flashPromptStatus('failed')
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="panel-header gap-4">
        <div>
          <p className="eyebrow mb-2">AI Analysis</p>
          <h2 className="section-title">Ollama review of your latest holdings</h2>
          <p className="body-muted mt-2 max-w-2xl">
            Start with an automatic portfolio read, then keep asking follow-up
            questions against the same current snapshot.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleGeneratePrompt} className="btn-secondary">
            Generate prompt
          </button>
          <button
            type="button"
            onClick={handleRefreshAnalysis}
            className="btn-secondary"
            disabled={chatMutation.isPending}
          >
            Refresh analysis
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <section className="card px-5 py-5 sm:px-6 sm:py-6">
          <div className="panel-header mb-5">
            <div>
              <p className="eyebrow mb-2">Current context</p>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Snapshot summary
              </h3>
            </div>
            <div className="badge badge-soft">{formatDateAU(snapshot.snapshot_date)}</div>
          </div>

          <div className="ai-metrics-grid">
            <Metric label="Total value" value={formatAUD(snapshot.total_value)} />
            <Metric label="Holdings" value={`${orderedPositions.length}`} />
            <Metric label="Broker" value={snapshot.broker ?? 'Unspecified'} />
            <Metric
              label="Total return"
              value={formatSignedAUD(summary.totalPnl, 0)}
              tone={summary.totalPnl > 0 ? 'positive' : summary.totalPnl < 0 ? 'negative' : 'neutral'}
            />
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow">Top positions</p>
              <p className="text-sm text-slate-500">By market value</p>
            </div>

            <div className="grid gap-3">
              {topPositions.map((position) => (
                <div key={position.id} className="subtle-tile">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold tracking-[-0.02em] text-slate-950">
                        {position.ticker}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatAUD(position.market_value)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {formatPct(position.weight_pct, 1)}
                      </p>
                      <p
                        className={clsx(
                          'mt-1 text-xs font-medium',
                          position.unrealized_pnl > 0 && 'text-emerald-600',
                          position.unrealized_pnl < 0 && 'text-rose-600',
                          !position.unrealized_pnl && 'text-slate-400'
                        )}
                      >
                        {position.unrealized_pnl == null
                          ? 'No return data'
                          : formatSignedAUD(position.unrealized_pnl)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 card-subtle px-4 py-4">
            <p className="eyebrow mb-3">Try asking</p>
            <div className="flex flex-wrap gap-2">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => submitQuestion(prompt)}
                  className="chat-prompt-chip"
                  disabled={chatMutation.isPending}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 card-subtle px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow mb-2">Shareable prompt</p>
                <h4 className="text-base font-semibold tracking-[-0.02em] text-slate-900">
                  Generate a professional prompt for another AI
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Builds a polished portfolio-analysis prompt with the latest snapshot,
                  key holdings, concentration, and return context.
                </p>
              </div>

              <button type="button" onClick={handleGeneratePrompt} className="btn-primary shrink-0">
                Generate &amp; copy prompt
              </button>
            </div>

            {shareablePrompt ? (
              <textarea
                value={shareablePrompt}
                onChange={(event) => setShareablePrompt(event.target.value)}
                className="input-shell mt-4 min-h-[18rem] resize-none font-mono text-xs leading-6"
                spellCheck={false}
                aria-label="Shareable portfolio prompt"
              />
            ) : (
              <div className="mt-4 rounded-[1.25rem] border border-dashed border-slate-200/80 bg-white/60 px-4 py-4">
                <p className="text-sm leading-6 text-slate-500">
                  Click generate to produce a ready-to-paste prompt. It will include a
                  summary, a markdown table of holdings, and a clear analysis brief.
                </p>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {promptStatus === 'copied'
                  ? 'Prompt copied to clipboard.'
                  : promptStatus === 'failed'
                    ? 'Prompt generated, but clipboard access failed.'
                    : 'Editable after generation, so you can tailor the ask before sending.'}
              </p>

              {shareablePrompt ? (
                <button type="button" onClick={handleCopyPrompt} className="btn-secondary">
                  Copy prompt
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card px-5 py-5 sm:px-6 sm:py-6">
          <div className="panel-header mb-5">
            <div>
              <p className="eyebrow mb-2">Conversation</p>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                Follow-up with the portfolio assistant
              </h3>
            </div>
            <div className="badge badge-neutral">
              {messages.filter((item) => item.role === 'assistant').length} replies
            </div>
          </div>

          <div ref={threadRef} className="chat-thread">
            {messages.map((message) => (
              <article
                key={message.id}
                className={clsx('chat-row', message.role === 'user' && 'chat-row-user')}
              >
                <div className={clsx('chat-avatar', message.role === 'user' && 'chat-avatar-user')}>
                  {message.role === 'user' ? 'You' : 'AI'}
                </div>
                <div
                  className={clsx(
                    'chat-bubble',
                    message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {message.content}
                  </p>
                  {message.role === 'assistant' && message.model ? (
                    <p className="mt-3 text-xs text-slate-400">
                      {message.model} · snapshot {formatDateAU(message.asOf)}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}

            {chatMutation.isPending ? (
              <article className="chat-row">
                <div className="chat-avatar">AI</div>
                <div className="chat-bubble chat-bubble-assistant">
                  <p className="text-sm leading-6 text-slate-500">
                    {pendingQuestion
                      ? 'Working through that follow-up against the current holdings.'
                      : 'Reviewing the latest holdings and preparing an overview.'}
                  </p>
                </div>
              </article>
            ) : null}

            {!messages.length && !chatMutation.isPending ? (
              <div className="empty-state min-h-[18rem]">
                <p className="eyebrow mb-2">Conversation</p>
                <h3 className="section-title">No analysis yet</h3>
                <p className="body-muted mt-3 max-w-md">
                  Generate the first AI review, then ask follow-up questions about
                  concentration, overlap, or risks.
                </p>
              </div>
            ) : null}
          </div>

          {requestError ? <div className="error-banner mt-5">{requestError}</div> : null}

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  if (draft.trim()) handleSubmit(event)
                }
              }}
              className="input-shell min-h-[7.5rem] resize-none"
              placeholder="Ask a follow-up about concentration, diversification, missing exposure, or what stands out."
              disabled={chatMutation.isPending}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Answers are grounded in the latest confirmed snapshot only.
              </p>
              <button
                type="submit"
                className="btn-primary"
                disabled={chatMutation.isPending || !draft.trim()}
              >
                Send question
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value, tone = 'neutral' }) {
  return (
    <div className="subtle-tile">
      <p className="tile-label">{label}</p>
      <p
        className={clsx(
          'mt-3 text-2xl font-semibold tracking-[-0.03em]',
          tone === 'positive' && 'text-emerald-600',
          tone === 'negative' && 'text-rose-600',
          tone === 'neutral' && 'text-slate-950'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
      <div className="skeleton-surface h-[34rem]" />
      <div className="skeleton-surface h-[34rem]" />
    </div>
  )
}

function Empty() {
  return (
    <div className="empty-state">
      <p className="eyebrow mb-2">AI Analysis</p>
      <h2 className="section-title">No portfolio snapshot yet</h2>
      <p className="body-muted mt-3 max-w-md">
        Upload and confirm a brokerage screenshot first, then the AI page can analyze
        the latest holdings and answer follow-up questions.
      </p>
    </div>
  )
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

function readError(error, fallback) {
  return error?.response?.data?.detail ?? error?.message ?? fallback
}
