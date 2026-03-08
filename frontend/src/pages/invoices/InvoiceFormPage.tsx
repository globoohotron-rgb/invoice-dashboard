import React, { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoicesApi, CreateInvoicePayload } from '../../api/invoices'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Toast from '../../components/ui/Toast'

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

const emptyItem = (): LineItem => ({ description: '', quantity: 1, unitPrice: 0 })

export default function InvoiceFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItem[]>([emptyItem()])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const { data: existing } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => invoicesApi.getOne(id!).then(r => r.data),
    enabled: isEdit,
  })

  useEffect(() => {
    document.title = isEdit ? 'Edit Invoice | InvoiceApp' : 'New Invoice | InvoiceApp'
  }, [isEdit])

  useEffect(() => {
    if (!existing) return
    setClientName(existing.clientName)
    setClientEmail(existing.clientEmail ?? '')
    setCurrency(existing.currency)
    setDueDate(existing.dueDate.slice(0, 10))
    setNotes(existing.notes ?? '')
    setItems(existing.items.map(i => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })))
  }, [existing])

  const mutation = useMutation({
    mutationFn: (payload: CreateInvoicePayload) =>
      isEdit ? invoicesApi.update(id!, payload) : invoicesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] })
      navigate('/invoices')
    },
    onError: () => setToast({ message: 'Save failed', type: 'error' }),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    mutation.mutate({ clientName, clientEmail: clientEmail || undefined, currency, dueDate, notes: notes || undefined, items })
  }

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  const grandTotal = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0)

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        {isEdit ? 'Edit Invoice' : 'New Invoice'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Client Name" value={clientName} onChange={e => setClientName(e.target.value)} required />
          <Input label="Client Email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
          <Input label="Currency" value={currency} onChange={e => setCurrency(e.target.value)} required />
          <Input label="Due Date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Line Items</h2>
            <button type="button" onClick={() => setItems(p => [...p, emptyItem()])} className="text-sm text-blue-600 hover:underline">
              + Add row
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-2 items-end">
                <Input
                  label={i === 0 ? 'Description' : undefined}
                  aria-label="Description"
                  value={it.description}
                  onChange={e => updateItem(i, 'description', e.target.value)}
                  required
                />
                <Input
                  label={i === 0 ? 'Qty' : undefined}
                  aria-label="Qty"
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                  required
                />
                <Input
                  label={i === 0 ? 'Unit Price' : undefined}
                  aria-label="Unit Price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={it.unitPrice}
                  onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                  disabled={items.length === 1}
                  className="mb-[1px] text-gray-400 hover:text-red-500 disabled:opacity-20"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 text-right text-sm font-semibold text-gray-700">
            Total: {grandTotal.toFixed(2)} {currency}
          </p>
        </div>

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <div className="flex gap-3">
          <Button type="submit" loading={mutation.isPending}>
            {isEdit ? 'Save changes' : 'Create invoice'}
          </Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/invoices')}>
            Cancel
          </Button>
        </div>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
