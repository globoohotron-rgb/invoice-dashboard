import 'dotenv/config'
import Fastify = require('fastify')
import fastifyCookie from '@fastify/cookie'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'

import authRoutes from './routes/auth'
import invoiceRoutes from './routes/invoices'
import dashboardRoutes from './routes/dashboard'

export function buildApp() {
  const fastify = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  })

  // Plugins (order matters: cookie before jwt)
  fastify.register(fastifyCookie)
  fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'test-secret-key-min-32-chars-long!!',
  })
  const allowedOrigins = [
    'http://localhost:5173',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ]
  fastify.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || /\.vercel\.app$/.test(origin)) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
  })

  // Health check (no auth)
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Routes
  fastify.register(authRoutes, { prefix: '/api/auth' })
  fastify.register(invoiceRoutes, { prefix: '/api/invoices' })
  fastify.register(dashboardRoutes, { prefix: '/api/dashboard' })

  return fastify
}

// Start server only when this file is run directly
if (require.main === module) {
  const app = buildApp()
  const port = Number(process.env.PORT) || 3000
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'

  app.listen({ port, host }).then(() => {
    console.log(`Server running on http://localhost:${port}`)
  }).catch((err: Error) => {
    console.error(err)
    process.exit(1)
  })
}
