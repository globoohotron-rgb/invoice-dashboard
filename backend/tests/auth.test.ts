import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/server'

// PREREQUISITE: seed must be run before these tests
// npm run db:seed

describe('Auth Routes', () => {
  let app: ReturnType<typeof buildApp>

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const uniqueEmail = `test_${Date.now()}@test.com`
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: uniqueEmail, password: 'password123', name: 'New User' },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body).toHaveProperty('user.email', uniqueEmail)
      expect(body.user).not.toHaveProperty('passwordHash')
      expect(body.user).toHaveProperty('role', 'MEMBER')
    })

    it('should set an httpOnly cookie on registration', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: `cookie_${Date.now()}@test.com`, password: 'password123', name: 'Cookie User' },
      })
      expect(res.statusCode).toBe(201)
      expect(res.headers['set-cookie']).toBeDefined()
      const cookie = Array.isArray(res.headers['set-cookie'])
        ? res.headers['set-cookie'][0]
        : res.headers['set-cookie']
      expect(cookie).toContain('HttpOnly')
    })

    it('should return 409 if email already exists', async () => {
      const email = `double_${Date.now()}@test.com`
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password: 'password123', name: 'User' },
      })
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email, password: 'password123', name: 'User' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should return 400 if password is less than 8 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'short@test.com', password: '123', name: 'User' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should return 400 if name is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'noname@test.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials and set httpOnly cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@test.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(200)
      const cookie = Array.isArray(res.headers['set-cookie'])
        ? res.headers['set-cookie'][0]
        : res.headers['set-cookie']
      expect(cookie).toContain('HttpOnly')
      expect(res.json()).toHaveProperty('user.email', 'admin@test.com')
    })

    it('should return 401 for wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@test.com', password: 'wrongpassword' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should return 401 for non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'ghost@test.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(401)
    })

    it('should not expose passwordHash in response', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@test.com', password: 'password123' },
      })
      expect(res.json().user).not.toHaveProperty('passwordHash')
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
      expect(res.statusCode).toBe(401)
    })

    it('should return current user with valid cookie', async () => {
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@test.com', password: 'password123' },
      })
      const cookie = Array.isArray(login.headers['set-cookie'])
        ? login.headers['set-cookie'].join('; ')
        : login.headers['set-cookie']

      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty('user.email', 'admin@test.com')
      expect(res.json().user).not.toHaveProperty('passwordHash')
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should clear the token cookie', async () => {
      const res = await app.inject({ method: 'POST', url: '/api/auth/logout' })
      expect(res.statusCode).toBe(200)
      const cookie = Array.isArray(res.headers['set-cookie'])
        ? res.headers['set-cookie'][0]
        : res.headers['set-cookie']
      // Cookie cleared — maxAge=0 or expires in past
      expect(cookie).toContain('token=;')
    })
  })

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const res = await app.inject({ method: 'GET', url: '/health' })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty('status', 'ok')
    })
  })
})
