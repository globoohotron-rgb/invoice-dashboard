import type { FastifyInstance } from 'fastify/types/instance'
import { prisma } from '../lib/prisma'
import { createAuthHandler } from '../lib/authenticate'
import { syncOverdueInvoices } from '../services/invoiceService'

type RevenuePeriod = 'week' | 'month' | 'quarter' | 'year'

function getStartDate(period: RevenuePeriod, anchor: Date): Date {
  const d = new Date(anchor)
  switch (period) {
    case 'week':
      d.setDate(d.getDate() - 7)
      break
    case 'month':
      d.setDate(d.getDate() - 30)
      break
    case 'quarter':
      d.setDate(d.getDate() - 90)
      break
    case 'year':
      d.setFullYear(d.getFullYear() - 1)
      break
  }
  return d
}

function getLabel(date: Date, period: RevenuePeriod): string {
  switch (period) {
    case 'week': {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    case 'month': {
      const weekNum = Math.ceil(date.getDate() / 7)
      return `W${weekNum} ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    }
    case 'quarter':
    case 'year': {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
  }
}

async function dashboardRoutes(fastify: FastifyInstance) {
  const authenticate = createAuthHandler(fastify)

  fastify.addHook('preHandler', authenticate)

  // GET /api/dashboard/summary
  fastify.get('/summary', async (_request, reply) => {
    await syncOverdueInvoices(prisma)

    // Use the most recent invoice date as anchor so summary reflects real data range
    const latestInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    const anchor = latestInvoice?.createdAt ?? new Date()
    const startOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1)

    const [outstanding, overdue, paidThisMonth, totalInvoices] = await Promise.all([
      prisma.invoice.aggregate({
        where: { status: { in: ['UNPAID', 'OVERDUE'] } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'OVERDUE' },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID', createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count(),
    ])

    return reply.send({
      outstanding: Number(outstanding._sum.totalAmount) || 0,
      overdue: Number(overdue._sum.totalAmount) || 0,
      paidThisMonth: Number(paidThisMonth._sum.totalAmount) || 0,
      totalInvoices,
    })
  })

  // GET /api/dashboard/revenue?period=week|month|quarter|year
  fastify.get<{ Querystring: { period?: string } }>('/revenue', async (request, reply) => {
    const validPeriods: RevenuePeriod[] = ['week', 'month', 'quarter', 'year']
    const period = request.query.period as RevenuePeriod

    if (!period || !validPeriods.includes(period)) {
      return reply.status(400).send({
        error: `period must be one of: ${validPeriods.join(', ')}`,
      })
    }

    // Anchor to the most recent paid invoice so the window covers real data
    const latestPaid = await prisma.invoice.findFirst({
      where: { status: 'PAID' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
    const anchor = latestPaid?.createdAt ?? new Date()
    const startDate = getStartDate(period, anchor)

    const invoices = await prisma.invoice.findMany({
      where: {
        status: 'PAID',
        createdAt: { gte: startDate },
      },
      select: { totalAmount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    // Group amounts by period label
    const grouped = new Map<string, number>()
    for (const inv of invoices) {
      const label = getLabel(inv.createdAt, period)
      grouped.set(label, (grouped.get(label) || 0) + Number(inv.totalAmount))
    }

    const result = Array.from(grouped.entries()).map(([label, amount]) => ({
      label,
      amount: Math.round(amount * 100) / 100,
    }))

    return reply.send(result)
  })
}

export default dashboardRoutes
