import type { FastifyInstance } from 'fastify/types/instance'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma'
import { createAuthHandler } from '../lib/authenticate'

async function authRoutes(fastify: FastifyInstance) {
  const authenticate = createAuthHandler(fastify)

  // POST /api/auth/register
  fastify.post<{
    Body: { email: string; password: string; name: string }
  }>('/register', async (request, reply) => {
    const { email, password, name } = request.body

    if (!email || !password || !name) {
      return reply.status(400).send({ error: 'email, password and name are required' })
    }
    if (password.length < 8) {
      return reply.status(400).send({ error: 'Password must be at least 8 characters' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'Email already in use' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    const token = fastify.jwt.sign({ userId: user.id, role: user.role })
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return reply.status(201).send({ user, token })
  })

  // POST /api/auth/login
  fastify.post<{
    Body: { email: string; password: string }
  }>('/login', async (request, reply) => {
    const { email, password } = request.body

    if (!email || !password) {
      return reply.status(400).send({ error: 'email and password are required' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = fastify.jwt.sign({ userId: user.id, role: user.role })
    reply.setCookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return reply.send({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    })
  })

  // POST /api/auth/logout
  fastify.post('/logout', async (request, reply) => {
    reply.clearCookie('token', { path: '/' })
    return reply.send({ message: 'Logged out' })
  })

  // GET /api/auth/me
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return reply.send({ user })
  })
}

export default authRoutes
