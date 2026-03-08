import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import InvoiceFormPage from '../../../pages/invoices/InvoiceFormPage'
import * as invoicesApi from '../../../api/invoices'

vi.mock('../../../api/invoices', () => ({
  invoicesApi: {
    create: vi.fn(),
    update: vi.fn(),
    getOne: vi.fn(),
  },
}))

function wrapper(initialPath = '/invoices/new') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/invoices/new" element={<InvoiceFormPage />} />
            <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />
            <Route path="/invoices" element={<div>Invoices</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
  )
}

describe('InvoiceFormPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('renders new invoice form with title', () => {
    render(wrapper())
    expect(screen.getByText('New Invoice')).toBeInTheDocument()
  })

  it('has Client Name, Due Date and Add row controls', () => {
    render(wrapper())
    expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument()
    expect(screen.getByText('+ Add row')).toBeInTheDocument()
  })

  it('adds a new line item row when clicking + Add row', () => {
    render(wrapper())
    const descriptions = screen.getAllByLabelText(/description/i)
    expect(descriptions).toHaveLength(1)
    fireEvent.click(screen.getByText('+ Add row'))
    expect(screen.getAllByLabelText(/description/i)).toHaveLength(2)
  })

  it('calculates grand total from line items', () => {
    render(wrapper())
    const qty = screen.getByLabelText(/qty/i) as HTMLInputElement
    const price = screen.getByLabelText(/unit price/i) as HTMLInputElement
    fireEvent.change(qty, { target: { value: '3' } })
    fireEvent.change(price, { target: { value: '50' } })
    expect(screen.getByText(/total: 150\.00/i)).toBeInTheDocument()
  })

  it('calls invoicesApi.create on submit', async () => {
    const createMock = vi.mocked(invoicesApi.invoicesApi.create)
    createMock.mockResolvedValue({ data: {} } as any)
    render(wrapper())
    fireEvent.change(screen.getByLabelText(/client name/i), { target: { value: 'Test Corp' } })
    fireEvent.change(screen.getByLabelText(/due date/i), { target: { value: '2025-12-31' } })
    fireEvent.submit(screen.getByRole('button', { name: /create invoice/i }).closest('form')!)
    await vi.waitFor(() => expect(createMock).toHaveBeenCalledOnce())
  })
})
