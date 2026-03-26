import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import clsx from 'clsx'

export default function DropZone({ onFile, loading }) {
  const onDrop = useCallback((accepted) => {
    if (accepted[0]) onFile(accepted[0])
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    disabled: loading,
  })

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'upload-dropzone',
        isDragActive
          ? 'upload-dropzone-active'
          : 'hover:border-slate-300 hover:bg-white/90',
        loading && 'cursor-not-allowed opacity-50'
      )}
    >
      <input {...getInputProps()} />
      <div className="mb-3 text-3xl">+</div>
      {isDragActive ? (
        <p className="text-sm font-medium text-blue-700">Drop screenshot here…</p>
      ) : (
        <>
          <p className="text-base font-medium text-slate-900">
            Drag and drop a brokerage screenshot
          </p>
          <p className="mt-1 text-sm text-slate-500">
            or click to browse, then review the parsed holdings before saving
          </p>
        </>
      )}
    </div>
  )
}
