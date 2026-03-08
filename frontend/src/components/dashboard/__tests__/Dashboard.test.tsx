import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import SummaryCards from '../../../components/dashboard/SummaryCards'
import RevenueChart from '../../../components/dashboard/RevenueChart'
import { DashboardSummary, RevenueDataPoint } from '../../../types'

// Recharts uses ResizeObserver which jsdom doesn't have
(globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function withProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

// ─── SummaryCards ──────────────────────────────────────────────────────────────

describe('SummaryCards', () => {
  const mockData: DashboardSummary = {
    outstanding: 15400,
    overdue: 3200,
    paidThisMonth: 8750,
    totalInvoices: 47,
  }

  it('shows skeleton placeholders while loading', () => {
    const { container } = render(withProviders(<SummaryCards data={undefined} loading={true} />))
    const pulseEls = container.querySelectorAll('.animate-pulse')
    expect(pulseEls.length).toBeGreaterThan(0)
  })

  it('renders four cards with correct labels', () => {
    render(withProviders(<SummaryCards data={mockData} loading={false} />))
    expect(screen.getByText('Outstanding')).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getByText('Paid This Month')).toBeInTheDocument()
    expect(screen.getByText('Total Invoices')).toBeInTheDocument()
  })

  it('formats outstanding amount as currency', () => {
    render(withProviders(<SummaryCards data={mockData} loading={false} />))
    expect(screen.getByText('$15,400.00')).toBeInTheDocument()
  })

  it('formats total invoices as plain number', () => {
    render(withProviders(<SummaryCards data={mockData} loading={false} />))
    expect(screen.getByText('47')).toBeInTheDocument()
  })

  it('applies red text to overdue value when overdue > 0', () => {
    render(withProviders(<SummaryCards data={mockData} loading={false} />))
    const overdueValue = screen.getByText('$3,200.00')
    expect(overdueValue.className).toContain('text-red-600')
  })

  it('does NOT apply red text when overdue is 0', () => {
    const zeroOverdue = { ...mockData, overdue: 0 }
    render(withProviders(<SummaryCards data={zeroOverdue} loading={false} />))
    // $0.00 is the overdue card value
    const zeroValue = screen.getByText('$0.00')
    expect(zeroValue.className).not.toContain('text-red-600')
  })

  it('shows skeleton when data is undefined even if loading is false', () => {
    const { container } = render(withProviders(<SummaryCards data={undefined} loading={false} />))
    const pulseEls = container.querySelectorAll('.animate-pulse')
    expect(pulseEls.length).toBeGreaterThan(0)
  })
})

// ─── RevenueChart ──────────────────────────────────────────────────────────────

describe('RevenueChart', () => {
  const mockData: RevenueDataPoint[] = [
    { label: 'Jan', amount: 4500 },
    { label: 'Feb', amount: 6200 },
    { label: 'Mar', amount: 3100 },
  ]

  const onPeriodChange = vi.fn()

  beforeEach(() => { onPeriodChange.mockClear() })

  it('renders period toggle buttons', () => {
    render(withProviders(
      <RevenueChart data={mockData} period="month" loading={false} onPeriodChange={onPeriodChange} />
    ))
    expect(screen.getByText('Week')).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Quarter')).toBeInTheDocument()
    expect(screen.getByText('Year')).toBeInTheDocument()
  })

  it('calls onPeriodChange with correct value when button clicked', () => {
    render(withProviders(
      <RevenueChart data={mockData} period="month" loading={false} onPeriodChange={onPeriodChange} />
    ))
    fireEvent.click(screen.getByText('Year'))
    expect(onPeriodChange).toHaveBeenCalledWith('year')

    fireEvent.click(screen.getByText('Week'))
    expect(onPeriodChange).toHaveBeenCalledWith('week')
  })

  it('shows empty state when data is empty', () => {
    render(withProviders(
      <RevenueChart data={[]} period="month" loading={false} onPeriodChange={onPeriodChange} />
    ))
    expect(screen.getByText(/No revenue data/i)).toBeInTheDocument()
  })

  it('shows spinner while loading', () => {
    render(withProviders(
      <RevenueChart data={[]} period="month" loading={true} onPeriodChange={onPeriodChange} />
    ))
    // Spinner renders an svg or div — verify empty state is NOT shown
    expect(screen.queryByText(/No revenue data/i)).not.toBeInTheDocument()
  })

  it('highlights the active period button', () => {
    render(withProviders(
      <RevenueChart data={mockData} period="quarter" loading={false} onPeriodChange={onPeriodChange} />
    ))
    const quarterBtn = screen.getByText('Quarter')
    expect(quarterBtn.className).toContain('bg-blue-600')

    const weekBtn = screen.getByText('Week')
    expect(weekBtn.className).not.toContain('bg-blue-600')
  })
})
