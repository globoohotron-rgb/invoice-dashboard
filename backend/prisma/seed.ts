import { PrismaClient, Role, InvoiceStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const clients = [
  { name: 'Acme Corp', email: 'billing@acme.com' },
  { name: 'Beta LLC', email: 'finance@beta.com' },
  { name: 'Gamma Solutions', email: 'accounts@gamma.com' },
  { name: 'Delta Industries', email: 'billing@delta.com' },
  { name: 'Epsilon Partners', email: 'invoices@epsilon.com' },
]

async function main() {
  console.log('Seeding database...')

  const adminHash = await bcrypt.hash('password123', 12)
  const memberHash = await bcrypt.hash('password123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      passwordHash: adminHash,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  })

  const member = await prisma.user.upsert({
    where: { email: 'member@test.com' },
    update: {},
    create: {
      email: 'member@test.com',
      passwordHash: memberHash,
      name: 'Member User',
      role: Role.MEMBER,
    },
  })

  // Clear existing invoices before re-seeding
  await prisma.invoice.deleteMany()

  const now = new Date()
  const statuses: InvoiceStatus[] = [
    InvoiceStatus.PAID,
    InvoiceStatus.UNPAID,
    InvoiceStatus.OVERDUE,
  ]

  for (let i = 0; i < 15; i++) {
    const client = clients[i % clients.length]
    const status = statuses[i % 3]

    // OVERDUE → dueDate in past; UNPAID/PAID → mix of past and future
    const daysOffset = status === InvoiceStatus.OVERDUE ? -(i + 1) * 5 : (i + 1) * 7
    const dueDate = new Date(now)
    dueDate.setDate(dueDate.getDate() + daysOffset)

    // Created at a point in the past (last 90 days)
    const createdAt = new Date(now)
    createdAt.setDate(createdAt.getDate() - (90 - i * 6))

    const items = [
      { description: 'Development', quantity: i + 1, unitPrice: 150 },
      { description: 'Design', quantity: Math.ceil((i + 1) / 2), unitPrice: 100 },
    ]
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-${String(i + 1).padStart(3, '0')}`,
        clientName: client.name,
        clientEmail: client.email,
        items,
        totalAmount,
        currency: 'USD',
        dueDate,
        status,
        notes: i % 4 === 0 ? 'Net 30. Thank you for your business.' : null,
        createdById: i % 5 === 0 ? member.id : admin.id,
        createdAt,
        updatedAt: status === InvoiceStatus.PAID ? createdAt : now,
      },
    })
  }

  console.log(`✓ Seeded: 2 users (admin@test.com, member@test.com), 15 invoices`)
  console.log('  Passwords: password123')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
