import React, { ReactNode } from 'react'
import Button from './Button'

interface ModalProps {
  open: boolean
  title: string
  children: ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
}

export default function Modal({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  danger = false,
  loading = false,
}: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-2 text-sm text-gray-600">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
