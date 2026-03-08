import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, formatInvoiceNumber, getStatusColor } from '../formatters'

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1500)).toBe('$1,500.00')
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('formats large numbers with thousands separator', () => {
    expect(formatCurrency(1500000)).toBe('$1,500,000.00')
  })

  it('formats decimal amounts correctly', () => {
    expect(formatCurrency(99.99)).toBe('$99.99')
  })

  it('formats EUR currency', () => {
    const result = formatCurrency(1500, 'EUR')
    expect(result).toContain('1,500.00')
  })
})

describe('formatDate', () => {
  it('formats ISO date string to readable format', () => {
    expect(formatDate('2026-03-15')).toContain('Mar')
    expect(formatDate('2026-03-15')).toContain('2026')
  })

  it('formats Date object', () => {
    const date = new Date('2026-01-01')
    const result = formatDate(date)
    expect(result).toContain('Jan')
    expect(result).toContain('2026')
  })
})

describe('formatInvoiceNumber', () => {
  it('should pad 1 to INV-001', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-001')
  })

  it('should pad 42 to INV-042', () => {
    expect(formatInvoiceNumber(42)).toBe('INV-042')
  })

  it('should not pad 3-digit numbers', () => {
    expect(formatInvoiceNumber(100)).toBe('INV-100')
  })

  it('should handle numbers above 999', () => {
    expect(formatInvoiceNumber(1000)).toBe('INV-1000')
  })
})

describe('getStatusColor', () => {
  it('returns green classes for PAID', () => {
    expect(getStatusColor('PAID')).toContain('green')
  })

  it('returns yellow classes for UNPAID', () => {
    expect(getStatusColor('UNPAID')).toContain('yellow')
  })

  it('returns red classes for OVERDUE', () => {
    expect(getStatusColor('OVERDUE')).toContain('red')
  })
})
