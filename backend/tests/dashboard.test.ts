import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/server'

// PREREQUISITE: seed must be run before these tests
// npm run db:seed

describe('Dashboard Routes', () => {
  let app: ReturnType<typeof buildApp>
  let authCookie: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()

    const login = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' },
    })
    authCookie = Array.isArray(login.headers['set-cookie'])
      ? login.headers['set-cookie'].join('; ')
      : login.headers['set-cookie']
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/dashboard/summary', () => {
    it('should return all 4 required fields', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/summary',
        headers: { cookie: authCookie },
      })
      expect(res.statusCode).toBe(200)
      const data = res.json()
      expect(data).toHaveProperty('outstanding')
      expect(data).toHaveProperty('overdue')
      expect(data).toHaveProperty('paidThisMonth')
      expect(data).toHaveProperty('totalInvoices')
    })

    it('should return numeric values for all fields', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/summary',
        headers: { cookie: authCookie },
      })
      const data = res.json()
      expect(typeof data.outstanding).toBe('number')
      expect(typeof data.overdue).toBe('number')
      expect(typeof data.paidThisMonth).toBe('number')
      expect(typeof data.totalInvoices).toBe('number')
    })

    it('should have totalInvoices > 0 after seeding', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/summary',
        headers: { cookie: authCookie },
      })
      expect(res.json().totalInvoices).toBeGreaterThan(0)
    })

    it('should return 401 without auth', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/dashboard/summary' })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/dashboard/revenue', () => {
    const validPeriods = ['week', 'month', 'quarter', 'year']

    for (const period of validPeriods) {
      it(`should return array for period=${period}`, async () => {
        const res = await app.inject({
          method: 'GET',
          url: `/api/dashboard/revenue?period=${period}`,
          headers: { cookie: authCookie },
        })
        expect(res.statusCode).toBe(200)
        const data = res.json()
        expect(Array.isArray(data)).toBe(true)

        // If data is present, each item must have label and amount
        if (data.length > 0) {
          expect(data[0]).toHaveProperty('label')
          expect(data[0]).toHaveProperty('amount')
          expect(typeof data[0].amount).toBe('number')
          expect(typeof data[0].label).toBe('string')
        }
      })
    }

    it('should return 400 for invalid period value', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/revenue?period=decade',
        headers: { cookie: authCookie },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should return 400 when period is missing', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/revenue',
        headers: { cookie: authCookie },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/dashboard/revenue?period=month',
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
