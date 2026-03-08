import api from './client'
import { Invoice, InvoiceFilters, InvoiceStatus } from '../types'

export interface CreateInvoicePayload {
  clientName: string
  clientEmail?: string
  items: { description: string; quantity: number; unitPrice: number }[]
  currency: string
  dueDate: string
  notes?: string
}

export const invoicesApi = {
  getAll: (filters?: InvoiceFilters) =>
    api.get<Invoice[]>('/invoices', { params: filters }),

  getOne: (id: string) =>
    api.get<Invoice>(`/invoices/${id}`),

  create: (data: CreateInvoicePayload) =>
    api.post<Invoice>('/invoices', data),

  update: (id: string, data: Partial<CreateInvoicePayload>) =>
    api.put<Invoice>(`/invoices/${id}`, data),

  updateStatus: (id: string, status: InvoiceStatus) =>
    api.patch<Invoice>(`/invoices/${id}/status`, { status }),

  delete: (id: string) =>
    api.delete(`/invoices/${id}`),
}
