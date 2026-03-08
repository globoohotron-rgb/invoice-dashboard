import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Badge from '../../../components/ui/Badge'

describe('Badge', () => {
  it('renders PAID with green classes', () => {
    render(<Badge status="PAID" />)
    const el = screen.getByText('PAID')
    expect(el).toBeInTheDocument()
    expect(el.className).toContain('bg-green-100')
    expect(el.className).toContain('text-green-800')
  })

  it('renders UNPAID with yellow classes', () => {
    render(<Badge status="UNPAID" />)
    const el = screen.getByText('UNPAID')
    expect(el.className).toContain('bg-yellow-100')
    expect(el.className).toContain('text-yellow-800')
  })

  it('renders OVERDUE with red classes', () => {
    render(<Badge status="OVERDUE" />)
    const el = screen.getByText('OVERDUE')
    expect(el.className).toContain('bg-red-100')
    expect(el.className).toContain('text-red-800')
  })
})
