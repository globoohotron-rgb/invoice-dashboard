import type { FastifyInstance } from 'fastify/types/instance'
import type { FastifyRequest } from 'fastify/types/request'
import type { FastifyReply } from 'fastify/types/reply'

export function createAuthHandler(fastify: FastifyInstance) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      let token = request.cookies?.token
      if (!token) {
        const authHeader = request.headers.authorization
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.slice(7)
        }
      }
      if (!token) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'No token provided' })
      }
      const decoded = fastify.jwt.verify(token) as { userId: string; role: string }
      request.user = decoded
    } catch {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid token' })
    }
  }
}
