import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { invoicesApi } from '../../api/invoices'
import Badge from '../ui/Badge'
import { formatCurrency, formatDate } from '../../utils/formatters'
import Spinner from '../ui/Spinner'

export default function RecentInvoices() {
  const navigate = useNavigate()

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices-recent'],
    queryFn: () =>
      invoicesApi.getAll({ sort: 'createdAt', order: 'desc' } as never).then(r => r.data.slice(0, 5)),
  })

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-semibold text-gray-900">Recent Invoices</h2>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      ) : invoices.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No invoices yet.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Invoice #', 'Client', 'Amount', 'Status', 'Due Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map(inv => (
              <tr
                key={inv.id}
                onClick={() => navigate(`/invoices/${inv.id}`)}
                className="cursor-pointer hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-mono text-blue-600">{inv.invoiceNumber}</td>
                <td className="px-4 py-3 text-gray-800">{inv.clientName}</td>
                <td className="px-4 py-3">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                <td className="px-4 py-3"><Badge status={inv.status} /></td>
                <td className="px-4 py-3 text-gray-500">{formatDate(inv.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t border-gray-100 px-6 py-3">
        <button
          onClick={() => navigate('/invoices')}
          className="text-sm text-blue-600 hover:underline"
        >
          View all invoices →
        </button>
      </div>
    </div>
  )
}
