import type { FastifyInstance } from 'fastify/types/instance'
import type { InvoiceStatus } from '@prisma/client'
import { InvoiceStatus as InvoiceStatusEnum } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { createAuthHandler } from '../lib/authenticate'
import {
  calculateTotal,
  getNextInvoiceNumber,
  syncOverdueInvoices,
} from '../services/invoiceService'

async function invoiceRoutes(fastify: FastifyInstance) {
  const authenticate = createAuthHandler(fastify)

  // All invoice routes require authentication
  fastify.addHook('preHandler', authenticate)

  // GET /api/invoices
  fastify.get<{
    Querystring: {
      status?: string
      client?: string
      from?: string
      to?: string
      sort?: string
      order?: string
    }
  }>('/', async (request, reply) => {
    await syncOverdueInvoices(prisma)

    const { status, client, from, to, sort = 'createdAt', order = 'desc' } = request.query

    const validSortFields = ['invoiceNumber', 'clientName', 'totalAmount', 'dueDate', 'createdAt', 'status']
    const sortField = validSortFields.includes(sort) ? sort : 'createdAt'
    const sortOrder = order === 'asc' ? 'asc' : 'desc'

    const where: Record<string, unknown> = {}
    if (status && status !== 'ALL' && Object.values(InvoiceStatusEnum).includes(status as InvoiceStatus)) {
      where.status = status as InvoiceStatus
    }
    if (client) {
      where.clientName = { contains: client, mode: 'insensitive' }
    }
    if (from || to) {
      where.dueDate = {}
      if (from) (where.dueDate as Record<string, unknown>).gte = new Date(from)
      if (to) (where.dueDate as Record<string, unknown>).lte = new Date(to)
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    })

    return reply.send(invoices)
  })

  // GET /api/invoices/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await syncOverdueInvoices(prisma)

    const invoice = await prisma.invoice.findUnique({
      where: { id: request.params.id },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    })
    if (!invoice) return reply.status(404).send({ error: 'Invoice not found' })
    return reply.send(invoice)
  })

  // POST /api/invoices
  fastify.post<{
    Body: {
      clientName: string
      clientEmail?: string
      items: { description: string; quantity: number; unitPrice: number }[]
      dueDate: string
      currency?: string
      notes?: string
    }
  }>('/', async (request, reply) => {
    const { clientName, clientEmail, items, dueDate, currency = 'USD', notes } = request.body

    if (!clientName || clientName.trim().length < 2) {
      return reply.status(400).send({ error: 'clientName is required (min 2 chars)' })
    }
    if (!items || items.length === 0) {
      return reply.status(400).send({ error: 'At least one item is required' })
    }
    if (!dueDate) {
      return reply.status(400).send({ error: 'dueDate is required' })
    }

    const invoiceNumber = await getNextInvoiceNumber(prisma)
    const totalAmount = calculateTotal(items)

    const enrichedItems = items.map((item) => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }))

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientName: clientName.trim(),
        clientEmail,
        items: enrichedItems,
        totalAmount,
        currency,
        dueDate: new Date(dueDate),
        notes,
        createdById: request.user.userId,
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    })

    return reply.status(201).send(invoice)
  })

  // PUT /api/invoices/:id
  fastify.put<{
    Params: { id: string }
    Body: {
      clientName?: string
      clientEmail?: string
      items?: { description: string; quantity: number; unitPrice: number }[]
      dueDate?: string
      currency?: string
      notes?: string
      status?: InvoiceStatus
    }
  }>('/:id', async (request, reply) => {
    const existing = await prisma.invoice.findUnique({ where: { id: request.params.id } })
    if (!existing) return reply.status(404).send({ error: 'Invoice not found' })

    const { clientName, clientEmail, items, dueDate, currency, notes, status } = request.body

    const enrichedItems = items
      ? items.map((item) => ({ ...item, total: item.quantity * item.unitPrice }))
      : undefined

    const updated = await prisma.invoice.update({
      where: { id: request.params.id },
      data: {
        ...(clientName && { clientName: clientName.trim() }),
        ...(clientEmail !== undefined && { clientEmail }),
        ...(enrichedItems && { items: enrichedItems, totalAmount: calculateTotal(items!) }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(currency && { currency }),
        ...(notes !== undefined && { notes }),
        ...(status && { status }),
      },
      include: { createdBy: { select: { id: true, name: true, email: true } } },
    })

    return reply.send(updated)
  })

  // PATCH /api/invoices/:id/status
  fastify.patch<{
    Params: { id: string }
    Body: { status: 'PAID' | 'UNPAID' }
  }>('/:id/status', async (request, reply) => {
    const { status } = request.body
    if (!['PAID', 'UNPAID'].includes(status)) {
      return reply.status(400).send({ error: 'status must be PAID or UNPAID' })
    }

    const existing = await prisma.invoice.findUnique({ where: { id: request.params.id } })
    if (!existing) return reply.status(404).send({ error: 'Invoice not found' })

    const updated = await prisma.invoice.update({
      where: { id: request.params.id },
      data: { status },
    })

    return reply.send(updated)
  })

  // DELETE /api/invoices/:id — ADMIN only
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (request.user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Forbidden: only ADMIN can delete invoices' })
    }

    const existing = await prisma.invoice.findUnique({ where: { id: request.params.id } })
    if (!existing) return reply.status(404).send({ error: 'Invoice not found' })

    await prisma.invoice.delete({ where: { id: request.params.id } })
    return reply.status(204).send()
  })
}

export default invoiceRoutes
