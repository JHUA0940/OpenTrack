import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { confirmSnapshot, getModels, uploadScreenshot } from '../../api/client'
import ConfirmationStep from './ConfirmationStep'
import DropZone from './DropZone'
import ModelSelector from './ModelSelector'

const STEPS = ['Upload', 'Review']

export default function UploadModal({
  userId,
  isPreparingUser,
  userError,
  onRetryUser,
  onClose,
}) {
  const queryClient = useQueryClient()
  const [selectedModel, setSelectedModel] = useState('auto')
  const [selectedFile, setSelectedFile] = useState(null)
  const [ocrResult, setOcrResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const { data: models } = useQuery({
    queryKey: ['models'],
    queryFn: getModels,
  })

  const uploadMutation = useMutation({
    mutationFn: ({ file, model }) => uploadScreenshot(file, model),
    onSuccess: (result) => {
      setOcrResult(result)
      setErrorMessage('')
    },
    onError: (error) => {
      setErrorMessage(readError(error, 'Upload failed. Please try another screenshot.'))
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (payload) => confirmSnapshot(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ])
      onClose()
    },
    onError: (error) => {
      setErrorMessage(readError(error, 'Save failed. Please review the parsed values and try again.'))
    },
  })

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy(uploadMutation.isPending, confirmMutation.isPending)) {
        onClose()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [confirmMutation.isPending, onClose, uploadMutation.isPending])

  const handleFile = (file) => {
    if (!userId) return
    setSelectedFile(file)
    setOcrResult(null)
    setErrorMessage('')
    uploadMutation.mutate({ file, model: selectedModel })
  }

  const handleReset = () => {
    setSelectedFile(null)
    setOcrResult(null)
    setErrorMessage('')
  }

  const handleConfirm = (payload) => {
    if (!userId) return
    setErrorMessage('')
    confirmMutation.mutate({ ...payload, user_id: userId })
  }

  const activeStep = ocrResult ? 1 : 0
  const showWorkspaceBlocker = !userId
  const effectiveError = errorMessage || userError

  return (
    <div className="upload-backdrop">
      <div className="upload-frame">
        <div className="upload-side-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">New snapshot</p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                Bring a broker screenshot into OpenTrack.
              </h2>
            </div>

            <button
              onClick={onClose}
              className="btn-ghost"
              disabled={isBusy(uploadMutation.isPending, confirmMutation.isPending)}
              aria-label="Close upload modal"
            >
              X
            </button>
          </div>

          <div className="mt-6 grid gap-2">
            {STEPS.map((step, index) => (
              <div
                key={step}
                className={index === activeStep ? 'upload-step upload-step-active' : 'upload-step'}
              >
                <span className="upload-step-index">0{index + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {index === 0
                      ? 'Choose a screenshot and preferred OCR model.'
                      : 'Review extracted values before saving.'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 card-subtle px-4 py-4">
            <p className="eyebrow mb-3">OCR model</p>
            <ModelSelector
              models={models}
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={showWorkspaceBlocker || uploadMutation.isPending}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="subtle-tile">
              <p className="tile-label">Accepted files</p>
              <p className="tile-value">PNG, JPG, WebP, or HEIC screenshots up to 20MB.</p>
            </div>
            <div className="subtle-tile">
              <p className="tile-label">Current selection</p>
              <p className="tile-value">{selectedFile?.name ?? 'No file selected yet.'}</p>
            </div>
          </div>
        </div>

        <div className="upload-main-panel">
          {effectiveError ? <div className="error-banner">{effectiveError}</div> : null}

          {showWorkspaceBlocker ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="eyebrow">Preparing</p>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  Getting the upload workspace ready
                </h3>
                <p className="body-muted max-w-2xl">
                  The upload flow needs a demo user before snapshots can be confirmed.
                  Once that is ready, you can drag in a screenshot immediately.
                </p>
              </div>

              <div className="card-subtle space-y-3 px-5 py-5">
                <div className="skeleton-surface h-5 w-40" />
                <div className="skeleton-surface h-4 w-72 max-w-full" />
                <div className="skeleton-surface h-4 w-56 max-w-full" />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={onRetryUser}
                  className="btn-primary"
                  disabled={isPreparingUser}
                >
                  {isPreparingUser ? 'Preparing…' : 'Retry setup'}
                </button>
                <button onClick={onClose} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          ) : !ocrResult ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="eyebrow">Step 1</p>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  Upload a clean screenshot
                </h3>
                <p className="body-muted max-w-2xl">
                  A full-screen broker capture usually gives the OCR pipeline the cleanest
                  reading, especially when prices and totals are visible together.
                </p>
              </div>

              <DropZone
                onFile={handleFile}
                loading={uploadMutation.isPending}
              />

              {uploadMutation.isPending ? (
                <div className="card-subtle px-4 py-4">
                  <p className="eyebrow mb-2">Processing</p>
                  <p className="text-sm text-slate-600">
                    Running OCR and preparing your review sheet.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="eyebrow mb-2">Step 2</p>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    Confirm the extracted snapshot
                  </h3>
                  <p className="body-muted max-w-2xl">
                    Adjust anything OCR misunderstood, then save a confirmed snapshot back
                    to the dashboard and analysis views.
                  </p>
                </div>

                <button
                  onClick={handleReset}
                  className="btn-secondary"
                  disabled={confirmMutation.isPending}
                >
                  Start over
                </button>
              </div>

              <ConfirmationStep
                ocrResult={ocrResult}
                onConfirm={handleConfirm}
                onBack={handleReset}
                loading={confirmMutation.isPending}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function isBusy(...states) {
  return states.some(Boolean)
}

function readError(error, fallback) {
  return error?.response?.data?.detail ?? error?.message ?? fallback
}
