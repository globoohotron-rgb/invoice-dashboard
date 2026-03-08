import React, { useEffect } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error'
  onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const colors = type === 'success'
    ? 'bg-green-600 text-white'
    : 'bg-red-600 text-white'

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg ${colors}`} role="alert">
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">✕</button>
    </div>
  )
}
