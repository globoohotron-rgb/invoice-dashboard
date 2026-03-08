export type InvoiceStatus = 'PAID' | 'UNPAID' | 'OVERDUE'

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(3, '0')}`
}

export function getStatusColor(status: InvoiceStatus): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800'
    case 'UNPAID':
      return 'bg-yellow-100 text-yellow-800'
    case 'OVERDUE':
      return 'bg-red-100 text-red-800'
  }
}
