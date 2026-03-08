import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from '../../api/invoices'
import { InvoiceFilters, InvoiceStatus } from '../../types'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'OVERDUE', label: 'Overdue' },
]

export default function InvoicesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [filters, setFilters] = useState<InvoiceFilters>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => { document.title = 'Invoices | InvoiceApp' }, [])

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.getAll(filters).then(r => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      setDeleteId(null)
      setToast({ message: 'Invoice deleted', type: 'success' })
    },
    onError: () => setToast({ message: 'Delete failed', type: 'error' }),
  })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <Button onClick={() => navigate('/invoices/new')}>+ New Invoice</Button>
      </div>

      <div className="mb-4">
        <Select
          options={statusOptions}
          value={filters.status ?? ''}
          onChange={e => setFilters(f => ({ ...f, status: (e.target.value as InvoiceStatus) || undefined }))}
          className="w-44"
        />
      </div>

      {isLoading ? (
        <div className="flex py-20 justify-center"><Spinner size="lg" /></div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <p className="mb-4 text-gray-400">No invoices found. Create your first one!</p>
          <Button onClick={() => navigate('/invoices/new')}>+ New Invoice</Button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Number', 'Client', 'Amount', 'Due Date', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-blue-600">
                      <Link to={`/invoices/${inv.id}`}>{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-4 py-3">{inv.clientName}</td>
                    <td className="px-4 py-3">{formatCurrency(inv.totalAmount, inv.currency)}</td>
                    <td className="px-4 py-3">{formatDate(inv.dueDate)}</td>
                    <td className="px-4 py-3"><Badge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                          className="text-gray-500 hover:text-blue-600 text-xs"
                        >
                          Edit
                        </button>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => setDeleteId(inv.id)}
                            className="text-gray-500 hover:text-red-600 text-xs"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {invoices.map(inv => (
              <div
                key={inv.id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="font-mono text-sm font-medium text-blue-600"
                  >
                    {inv.invoiceNumber}
                  </Link>
                  <Badge status={inv.status} />
                </div>
                <p className="mt-1 font-medium text-gray-900">{inv.clientName}</p>
                <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                  <span>{formatCurrency(inv.totalAmount, inv.currency)}</span>
                  <span>Due {formatDate(inv.dueDate)}</span>
                </div>
                <div className="mt-3 flex gap-3 border-t border-gray-100 pt-3">
                  <button
                    onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                    className="text-xs text-gray-500 hover:text-blue-600"
                  >
                    Edit
                  </button>
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={() => setDeleteId(inv.id)}
                      className="text-xs text-gray-500 hover:text-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <Modal
        open={!!deleteId}
        title="Delete invoice"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      >
        Are you sure you want to delete this invoice? This action cannot be undone.
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}

