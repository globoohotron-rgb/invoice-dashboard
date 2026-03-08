export type Role = 'ADMIN' | 'MEMBER'
export type InvoiceStatus = 'PAID' | 'UNPAID' | 'OVERDUE'
export type RevenuePeriod = 'week' | 'month' | 'quarter' | 'year'

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  clientName: string
  clientEmail?: string
  items: InvoiceItem[]
  totalAmount: number
  currency: string
  dueDate: string
  status: InvoiceStatus
  notes?: string
  createdBy: User
  createdAt: string
  updatedAt: string
}

export interface DashboardSummary {
  outstanding: number
  overdue: number
  paidThisMonth: number
  totalInvoices: number
}

export interface RevenueDataPoint {
  label: string
  amount: number
}

export interface InvoiceFilters {
  status?: InvoiceStatus | 'ALL'
  client?: string
  from?: string
  to?: string
  sort?: string
  order?: 'asc' | 'desc'
}
