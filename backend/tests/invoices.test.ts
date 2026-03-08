import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/server'

// PREREQUISITE: seed must be run before these tests
// npm run db:seed

describe('Invoice Routes', () => {
  let app: ReturnType<typeof buildApp>
  let adminCookie: string
  let memberCookie: string
  let createdInvoiceId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()

    // Login as ADMIN
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' },
    })
    adminCookie = (Array.isArray(adminLogin.headers['set-cookie'])
      ? adminLogin.headers['set-cookie'].join('; ')
      : adminLogin.headers['set-cookie']) ?? ''

    // Login as MEMBER
    const memberLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'member@test.com', password: 'password123' },
    })
    memberCookie = (Array.isArray(memberLogin.headers['set-cookie'])
      ? memberLogin.headers['set-cookie'].join('; ')
      : memberLogin.headers['set-cookie']) ?? ''
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/invoices', () => {
    it('should create invoice with auto-generated INV-XXX number', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        headers: { cookie: adminCookie },
        payload: {
          clientName: 'Acme Corp',
          items: [{ description: 'Development', quantity: 5, unitPrice: 100 }],
          dueDate: '2026-04-01',
        },
      })
      expect(res.statusCode).toBe(201)
      const invoice = res.json()
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{3,}$/)
      expect(Number(invoice.totalAmount)).toBe(500)
      expect(invoice.status).toBe('UNPAID')
      expect(invoice.clientName).toBe('Acme Corp')
      createdInvoiceId = invoice.id
    })

    it('should calculate totalAmount correctly from multiple items', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        headers: { cookie: adminCookie },
        payload: {
          clientName: 'Beta LLC',
          items: [
            { description: 'Design', quantity: 3, unitPrice: 200 },
            { description: 'Dev', quantity: 2, unitPrice: 150 },
          ],
          dueDate: '2026-04-15',
        },
      })
      expect(res.statusCode).toBe(201)
      expect(Number(res.json().totalAmount)).toBe(900) // 3*200 + 2*150
    })

    it('should enrich items with total field', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        headers: { cookie: adminCookie },
        payload: {
          clientName: 'Test Client',
          items: [{ description: 'Work', quantity: 2, unitPrice: 75 }],
          dueDate: '2026-05-01',
        },
      })
      const items = res.json().items as { total: number }[]
      expect(items[0].total).toBe(150) // 2 * 75
    })

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        payload: { clientName: 'Test', items: [{ description: 'A', quantity: 1, unitPrice: 10 }], dueDate: '2026-04-01' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should return 400 if clientName is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        headers: { cookie: adminCookie },
        payload: { items: [{ description: 'Dev', quantity: 1, unitPrice: 100 }], dueDate: '2026-04-01' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should return 400 if items array is empty', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        headers: { cookie: adminCookie },
        payload: { clientName: 'Test', items: [], dueDate: '2026-04-01' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /api/invoices', () => {
    it('should return array of invoices', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/invoices',
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
      expect(res.json().length).toBeGreaterThan(0)
    })

    it('should filter by status=PAID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/invoices?status=PAID',
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      const invoices = res.json()
      expect(invoices.every((inv: { status: string }) => inv.status === 'PAID')).toBe(true)
    })

    it('should filter by status=UNPAID', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/invoices?status=UNPAID',
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      // All returned should be UNPAID (not OVERDUE — those are already past-due seeded)
      const invoices = res.json()
      expect(invoices.every((inv: { status: string }) => inv.status === 'UNPAID')).toBe(true)
    })

    it('should return 401 without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/invoices' })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/invoices/:id', () => {
    it('should return a single invoice', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/invoices/${createdInvoiceId}`,
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty('id', createdInvoiceId)
    })

    it('should return 404 for non-existent id', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/invoices/00000000-0000-0000-0000-000000000000',
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('PATCH /api/invoices/:id/status', () => {
    it('should mark invoice as PAID', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/invoices/${createdInvoiceId}/status`,
        headers: { cookie: adminCookie },
        payload: { status: 'PAID' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('PAID')
    })

    it('should mark invoice back as UNPAID', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/invoices/${createdInvoiceId}/status`,
        headers: { cookie: adminCookie },
        payload: { status: 'UNPAID' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('UNPAID')
    })

    it('should return 400 for invalid status value', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/invoices/${createdInvoiceId}/status`,
        headers: { cookie: adminCookie },
        payload: { status: 'OVERDUE' }, // OVERDUE is set automatically, not manually
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('DELETE /api/invoices/:id', () => {
    it('should return 403 for MEMBER role', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/invoices/${createdInvoiceId}`,
        headers: { cookie: memberCookie },
      })
      expect(res.statusCode).toBe(403)
    })

    it('should delete invoice for ADMIN role and return 204', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/invoices/${createdInvoiceId}`,
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(204)
    })

    it('should return 404 after deletion', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/invoices/${createdInvoiceId}`,
        headers: { cookie: adminCookie },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
