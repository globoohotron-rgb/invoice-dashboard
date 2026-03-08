import React from 'react'
import { DashboardSummary } from '../../types'
import { formatCurrency } from '../../utils/formatters'

interface SummaryCardsProps {
  data: DashboardSummary | undefined
  loading: boolean
}

const Skeleton = () => (
  <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
)

const cards = (data: DashboardSummary) => [
  {
    label: 'Outstanding',
    value: formatCurrency(data.outstanding),
    sub: 'Unpaid + Overdue',
    border: 'border-l-4 border-blue-500',
    valueClass: '',
  },
  {
    label: 'Overdue',
    value: formatCurrency(data.overdue),
    sub: 'Past due date',
    border: 'border-l-4 border-red-500',
    valueClass: data.overdue > 0 ? 'text-red-600' : '',
  },
  {
    label: 'Paid This Month',
    value: formatCurrency(data.paidThisMonth),
    sub: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    border: 'border-l-4 border-green-500',
    valueClass: '',
  },
  {
    label: 'Total Invoices',
    value: String(data.totalInvoices),
    sub: 'All time',
    border: 'border-l-4 border-gray-400',
    valueClass: '',
  },
]

export default function SummaryCards({ data, loading }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {loading || !data
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm border-l-4 border-l-gray-200">
              <div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200" />
              <Skeleton />
              <div className="mt-2 h-3 w-28 animate-pulse rounded bg-gray-100" />
            </div>
          ))
        : cards(data).map(c => (
            <div key={c.label} className={`rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${c.border}`}>
              <p className="text-sm font-medium text-gray-500">{c.label}</p>
              <p className={`mt-1 text-2xl font-bold text-gray-900 ${c.valueClass}`}>{c.value}</p>
              <p className="mt-1 text-xs text-gray-400">{c.sub}</p>
            </div>
          ))}
    </div>
  )
}
