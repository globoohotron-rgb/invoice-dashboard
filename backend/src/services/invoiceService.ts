import { PrismaClient } from '@prisma/client'

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total?: number
}

/**
 * Calculate total amount from invoice line items.
 */
export function calculateTotal(items: InvoiceItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
}

/**
 * Returns true if an UNPAID invoice has a due date in the past.
 */
export function isOverdue(dueDate: Date, status: string): boolean {
  if (status !== 'UNPAID') return false
  return new Date(dueDate) < new Date()
}

/**
 * Format sequential number as INV-001, INV-042, etc.
 */
export function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(3, '0')}`
}

/**
 * Query the database for the next available invoice number.
 */
export async function getNextInvoiceNumber(prisma: PrismaClient): Promise<string> {
  const last = await prisma.invoice.findFirst({
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  })
  if (!last) return 'INV-001'
  const num = parseInt(last.invoiceNumber.replace('INV-', ''), 10)
  return formatInvoiceNumber(isNaN(num) ? 1 : num + 1)
}

/**
 * Mark all UNPAID invoices with dueDate in the past as OVERDUE.
 * Call this before returning lists or summaries.
 */
export async function syncOverdueInvoices(prisma: PrismaClient): Promise<void> {
  await prisma.invoice.updateMany({
    where: {
      status: 'UNPAID',
      dueDate: { lt: new Date() },
    },
    data: { status: 'OVERDUE' },
  })
}
