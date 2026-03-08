import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from '../../api/invoices'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Toast from '../../components/ui/Toast'
import Spinner from '../../components/ui/Spinner'
import { formatCurrency, formatDate } from '../../utils/formatters'
import { useAuth } from '../../contexts/AuthContext'

const statusOptions = [
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
]

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showDelete, setShowDelete] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getOne(id!).then(r => r.data),
    enabled: !!id,
  })

  useEffect(() => {
    if (invoice) document.title = `${invoice.invoiceNumber} | InvoiceApp`
  }, [invoice])

  const markPaidMutation = useMutation({
    mutationFn: () => invoicesApi.updateStatus(id!, 'PAID'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice', id] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] })
      setToast({ message: 'Marked as paid', type: 'success' })
    },
    onError: () => setToast({ message: 'Update failed', type: 'error' }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => invoicesApi.delete(id!),
    onSuccess: () => navigate('/invoices'),
    onError: () => setToast({ message: 'Delete failed', type: 'error' }),
  })

  if (isLoading) return <div className="flex py-20 justify-center"><Spinner size="lg" /></div>
  if (!invoice) return <p className="text-red-600">Invoice not found</p>

  return (
    <>
      {/* Print styles */}
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      {/* Action bar */}
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Invoices
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => navigate(`/invoices/${id}/edit`)}>Edit</Button>
          {invoice.status !== 'PAID' && (
            <Button onClick={() => markPaidMutation.mutate()} loading={markPaidMutation.isPending}>
              Mark Paid
            </Button>
          )}
          {user?.role === 'ADMIN' && (
            <Button variant="danger" onClick={() => setShowDelete(true)}>Delete</Button>
          )}
          <Button variant="secondary" onClick={() => window.print()}>🖨 Print</Button>
        </div>
      </div>

      {/* Invoice document */}
      <div className="mx-auto max-w-3xl rounded-lg border border-gray-200 bg-white p-8 shadow-md">
        {/* Top row */}
        <div className="mb-8 flex items-start justify-between">
          <p className="text-3xl font-extrabold tracking-wide text-blue-600">INVOICE</p>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-800">{invoice.invoiceNumber}</p>
            <div className="mt-1"><Badge status={invoice.status} /></div>
          </div>
        </div>

        {/* From / To */}
        <div className="mb-8 grid grid-cols-2 gap-8 text-sm">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">From</p>
            <p className="font-medium text-gray-800">InvoiceApp</p>
            <p className="text-gray-500">your@company.com</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">To</p>
            <p className="font-medium text-gray-800">{invoice.clientName}</p>
            {invoice.clientEmail && <p className="text-gray-500">{invoice.clientEmail}</p>}
          </div>
        </div>

        {/* Dates */}
        <div className="mb-8 grid grid-cols-3 gap-4 border-t border-gray-100 pt-6 text-sm">
          <div>
            <p className="text-xs text-gray-400">Issue Date</p>
            <p className="font-medium">{formatDate(invoice.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Due Date</p>
            <p className={`font-medium ${invoice.status === 'OVERDUE' ? 'text-red-600' : ''}`}>
              {formatDate(invoice.dueDate)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Currency</p>
            <p className="font-medium">{invoice.currency}</p>
          </div>
        </div>

        {/* Line items */}
        <table className="mb-6 min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="pb-2 text-left font-medium text-gray-500">Description</th>
              <th className="pb-2 text-center font-medium text-gray-500">Qty</th>
              <th className="pb-2 text-right font-medium text-gray-500">Unit Price</th>
              <th className="pb-2 text-right font-medium text-gray-500">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.items.map((it, i) => (
              <tr key={i}>
                <td className="py-2">{it.description}</td>
                <td className="py-2 text-center">{it.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(it.unitPrice, invoice.currency)}</td>
                <td className="py-2 text-right font-medium">{formatCurrency(it.total, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={3} className="pt-3 text-right text-sm font-semibold text-gray-700">Total</td>
              <td className="pt-3 text-right text-lg font-bold text-gray-900">
                {formatCurrency(invoice.totalAmount, invoice.currency)}
              </td>
            </tr>
          </tfoot>
        </table>

        {invoice.notes && (
          <div className="mb-6 rounded-md bg-gray-50 p-4 text-sm text-gray-600">
            <p className="mb-1 font-medium text-gray-700">Notes</p>
            <p>{invoice.notes}</p>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
          Created: {formatDate(invoice.createdAt)}
        </div>
      </div>

      <Modal
        open={showDelete}
        title="Delete Invoice"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDelete(false)}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
      >
        Are you sure you want to delete <strong>{invoice.invoiceNumber}</strong>? This action cannot be undone.
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}
