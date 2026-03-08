import { describe, it, expect } from 'vitest'
import {
  calculateTotal,
  isOverdue,
  formatInvoiceNumber,
} from '../src/services/invoiceService'

describe('calculateTotal', () => {
  it('should sum quantity * unitPrice for all items', () => {
    const items = [
      { description: 'Dev', quantity: 5, unitPrice: 100 },
      { description: 'Design', quantity: 2, unitPrice: 150 },
    ]
    expect(calculateTotal(items)).toBe(800) // 500 + 300
  })

  it('should return 0 for empty items array', () => {
    expect(calculateTotal([])).toBe(0)
  })

  it('should handle single item correctly', () => {
    expect(calculateTotal([{ description: 'Consulting', quantity: 1, unitPrice: 250 }])).toBe(250)
  })

  it('should handle decimal prices correctly', () => {
    const items = [{ description: 'Hour', quantity: 3, unitPrice: 33.33 }]
    expect(calculateTotal(items)).toBeCloseTo(99.99)
  })

  it('should handle large quantities', () => {
    const items = [{ description: 'Bulk', quantity: 1000, unitPrice: 9.99 }]
    expect(calculateTotal(items)).toBeCloseTo(9990)
  })
})

describe('isOverdue', () => {
  it('should return true if dueDate is in the past and status is UNPAID', () => {
    const yesterday = new Date(Date.now() - 86400000)
    expect(isOverdue(yesterday, 'UNPAID')).toBe(true)
  })

  it('should return false if status is PAID (even if past due date)', () => {
    const yesterday = new Date(Date.now() - 86400000)
    expect(isOverdue(yesterday, 'PAID')).toBe(false)
  })

  it('should return false if status is OVERDUE (already processed)', () => {
    const yesterday = new Date(Date.now() - 86400000)
    expect(isOverdue(yesterday, 'OVERDUE')).toBe(false)
  })

  it('should return false if dueDate is in the future', () => {
    const tomorrow = new Date(Date.now() + 86400000)
    expect(isOverdue(tomorrow, 'UNPAID')).toBe(false)
  })

  it('should return false if dueDate is exactly now (boundary)', () => {
    // Slightly in the future to avoid flaky test at exact millisecond
    const nowPlusSec = new Date(Date.now() + 1000)
    expect(isOverdue(nowPlusSec, 'UNPAID')).toBe(false)
  })
})

describe('formatInvoiceNumber', () => {
  it('should pad single digit to 3 places', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-001')
  })

  it('should pad double digit to 3 places', () => {
    expect(formatInvoiceNumber(42)).toBe('INV-042')
  })

  it('should not pad 3-digit number', () => {
    expect(formatInvoiceNumber(100)).toBe('INV-100')
  })

  it('should handle numbers above 999', () => {
    expect(formatInvoiceNumber(1000)).toBe('INV-1000')
  })

  it('should handle edge case of 999', () => {
    expect(formatInvoiceNumber(999)).toBe('INV-999')
  })
})
