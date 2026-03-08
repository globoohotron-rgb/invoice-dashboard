import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { RevenueDataPoint, RevenuePeriod } from '../../types'
import { formatCurrency } from '../../utils/formatters'
import Spinner from '../ui/Spinner'

interface RevenueChartProps {
  data: RevenueDataPoint[]
  period: RevenuePeriod
  loading: boolean
  onPeriodChange: (p: RevenuePeriod) => void
}

const periods: { value: RevenuePeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'year', label: 'Year' },
]

export default function RevenueChart({ data, period, loading, onPeriodChange }: RevenueChartProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-gray-900">Revenue</h2>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          No revenue data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: number) => [formatCurrency(v), 'Revenue']}
              contentStyle={{ borderRadius: '8px', fontSize: '13px' }}
            />
            <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
