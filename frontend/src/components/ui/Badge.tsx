import React from 'react'
import { InvoiceStatus } from '../../types'

const colorMap: Record<InvoiceStatus, string> = {
  PAID: 'bg-green-100 text-green-800',
  UNPAID: 'bg-yellow-100 text-yellow-800',
  OVERDUE: 'bg-red-100 text-red-800',
}

interface BadgeProps {
  status: InvoiceStatus
}

export default function Badge({ status }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorMap[status]}`}>
      {status}
    </span>
  )
}
