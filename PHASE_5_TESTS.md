# Phase 5 — Test Coverage

## Мета
Написати тести які підтверджують що критичні частини додатку працюють правильно.

## Стратегія
Не покриваємо все — покриваємо найважливіше:
- **Backend:** API routes (integration tests) + бізнес-логіка (unit tests)
- **Frontend:** ключові компоненти (component tests)
- **E2E:** один критичний flow

---

## Backend Tests

### Інструменти
```bash
cd backend
npm install -D vitest @vitest/coverage-v8 supertest @types/supertest
```

### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'prisma/'],
    },
  },
})
```

### package.json scripts (додати)
```json
"test": "vitest",
"test:run": "vitest run",
"test:coverage": "vitest run --coverage"
```

---

### Test: Auth Routes

**tests/auth.test.ts**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/server' // export Fastify instance

describe('Auth Routes', () => {
  let app: any

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/register', () => {
    it('should register a new user and return token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'new@test.com', password: 'password123', name: 'New User' }
      })
      expect(res.statusCode).toBe(201)
      expect(res.json()).toHaveProperty('user.email', 'new@test.com')
      expect(res.json().user).not.toHaveProperty('passwordHash')
    })

    it('should return 400 if email already exists', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'double@test.com', password: 'password123', name: 'User' }
      })
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'double@test.com', password: 'password123', name: 'User' }
      })
      expect(res.statusCode).toBe(409)
    })

    it('should return 400 if password is less than 8 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'short@test.com', password: '123', name: 'User' }
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login and set httpOnly cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@test.com', password: 'password123' }
      })
      expect(res.statusCode).toBe(200)
      expect(res.headers['set-cookie']).toContain('HttpOnly')
    })

    it('should return 401 for wrong password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@test.com', password: 'wrongpassword' }
      })
      expect(res.statusCode).toBe(401)
    })

    it('should return 401 for non-existent email', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'ghost@test.com', password: 'password123' }
      })
      expect(res.statusCode).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/auth/me' })
      expect(res.statusCode).toBe(401)
    })

    it('should return current user with valid token', async () => {
      const login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'admin@test.com', password: 'password123' }
      })
      const cookie = login.headers['set-cookie']
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { cookie }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toHaveProperty('user.email', 'admin@test.com')
    })
  })
})
```

---

### Test: Invoice Routes

**tests/invoices.test.ts**

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { buildApp } from '../src/server'

describe('Invoice Routes', () => {
  let app: any
  let authCookie: string
  let memberCookie: string
  let createdInvoiceId: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()

    // Login as admin
    const adminLogin = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' }
    })
    authCookie = adminLogin.headers['set-cookie']

    // Login as member
    const memberLogin = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'member@test.com', password: 'password123' }
    })
    memberCookie = memberLogin.headers['set-cookie']
  })

  afterAll(async () => { await app.close() })

  describe('POST /api/invoices', () => {
    it('should create invoice with auto-generated number', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        headers: { cookie: authCookie },
        payload: {
          clientName: 'Acme Corp',
          items: [{ description: 'Development', quantity: 5, unitPrice: 100 }],
          dueDate: '2026-04-01',
        }
      })
      expect(res.statusCode).toBe(201)
      const invoice = res.json()
      expect(invoice.invoiceNumber).toMatch(/^INV-\d{3}$/)
      expect(invoice.totalAmount).toBe(500)
      expect(invoice.status).toBe('UNPAID')
      createdInvoiceId = invoice.id
    })

    it('should calculate totalAmount from items', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        headers: { cookie: authCookie },
        payload: {
          clientName: 'Beta LLC',
          items: [
            { description: 'Design', quantity: 3, unitPrice: 200 },
            { description: 'Dev', quantity: 2, unitPrice: 150 },
          ],
          dueDate: '2026-04-15',
        }
      })
      expect(res.json().totalAmount).toBe(900) // 3*200 + 2*150
    })

    it('should return 401 without auth', async () => {
      const res = await app.inject({
        method: 'POST', url: '/api/invoices',
        payload: { clientName: 'Test', items: [], dueDate: '2026-04-01' }
      })
      expect(res.statusCode).toBe(401)
    })

    it('should return 400 if clientName is missing', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/invoices',
        headers: { cookie: authCookie },
        payload: { items: [{ description: 'Dev', quantity: 1, unitPrice: 100 }], dueDate: '2026-04-01' }
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /api/invoices', () => {
    it('should return list of invoices', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/invoices',
        headers: { cookie: authCookie }
      })
      expect(res.statusCode).toBe(200)
      expect(Array.isArray(res.json())).toBe(true)
    })

    it('should filter by status', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/invoices?status=PAID',
        headers: { cookie: authCookie }
      })
      const invoices = res.json()
      expect(invoices.every((i: any) => i.status === 'PAID')).toBe(true)
    })
  })

  describe('PATCH /api/invoices/:id/status', () => {
    it('should mark invoice as PAID', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/invoices/${createdInvoiceId}/status`,
        headers: { cookie: authCookie },
        payload: { status: 'PAID' }
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('PAID')
    })
  })

  describe('DELETE /api/invoices/:id', () => {
    it('should return 403 for MEMBER role', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/invoices/${createdInvoiceId}`,
        headers: { cookie: memberCookie }
      })
      expect(res.statusCode).toBe(403)
    })

    it('should delete invoice for ADMIN role', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/invoices/${createdInvoiceId}`,
        headers: { cookie: authCookie }
      })
      expect(res.statusCode).toBe(204)
    })
  })
})
```

---

### Test: Business Logic (Unit)

**tests/invoice-logic.test.ts**

```typescript
import { describe, it, expect } from 'vitest'
import { calculateTotal, isOverdue, formatInvoiceNumber } from '../src/services/invoiceService'

describe('Invoice Business Logic', () => {
  describe('calculateTotal', () => {
    it('should sum quantity * unitPrice for all items', () => {
      const items = [
        { description: 'Dev', quantity: 5, unitPrice: 100 },
        { description: 'Design', quantity: 2, unitPrice: 150 },
      ]
      expect(calculateTotal(items)).toBe(800) // 500 + 300
    })

    it('should return 0 for empty items', () => {
      expect(calculateTotal([])).toBe(0)
    })

    it('should handle decimal prices correctly', () => {
      const items = [{ description: 'Hour', quantity: 3, unitPrice: 33.33 }]
      expect(calculateTotal(items)).toBeCloseTo(99.99)
    })
  })

  describe('isOverdue', () => {
    it('should return true if dueDate is in the past and status is UNPAID', () => {
      const yesterday = new Date(Date.now() - 86400000)
      expect(isOverdue(yesterday, 'UNPAID')).toBe(true)
    })

    it('should return false if status is PAID (even if past due)', () => {
      const yesterday = new Date(Date.now() - 86400000)
      expect(isOverdue(yesterday, 'PAID')).toBe(false)
    })

    it('should return false if dueDate is in the future', () => {
      const tomorrow = new Date(Date.now() + 86400000)
      expect(isOverdue(tomorrow, 'UNPAID')).toBe(false)
    })
  })

  describe('formatInvoiceNumber', () => {
    it('should pad number to 3 digits', () => {
      expect(formatInvoiceNumber(1)).toBe('INV-001')
      expect(formatInvoiceNumber(42)).toBe('INV-042')
      expect(formatInvoiceNumber(100)).toBe('INV-100')
    })
  })
})
```

---

### Test: Dashboard Routes

**tests/dashboard.test.ts**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../src/server'

describe('Dashboard Routes', () => {
  let app: any
  let authCookie: string

  beforeAll(async () => {
    app = buildApp()
    await app.ready()
    const login = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'admin@test.com', password: 'password123' }
    })
    authCookie = login.headers['set-cookie']
  })

  afterAll(async () => { await app.close() })

  describe('GET /api/dashboard/summary', () => {
    it('should return all 4 summary fields', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/dashboard/summary',
        headers: { cookie: authCookie }
      })
      expect(res.statusCode).toBe(200)
      const data = res.json()
      expect(data).toHaveProperty('outstanding')
      expect(data).toHaveProperty('overdue')
      expect(data).toHaveProperty('paidThisMonth')
      expect(data).toHaveProperty('totalInvoices')
      expect(typeof data.outstanding).toBe('number')
    })
  })

  describe('GET /api/dashboard/revenue', () => {
    it('should return array for period=month', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/dashboard/revenue?period=month',
        headers: { cookie: authCookie }
      })
      expect(res.statusCode).toBe(200)
      const data = res.json()
      expect(Array.isArray(data)).toBe(true)
      if (data.length > 0) {
        expect(data[0]).toHaveProperty('label')
        expect(data[0]).toHaveProperty('amount')
      }
    })

    it('should return 400 for invalid period', async () => {
      const res = await app.inject({
        method: 'GET', url: '/api/dashboard/revenue?period=decade',
        headers: { cookie: authCookie }
      })
      expect(res.statusCode).toBe(400)
    })
  })
})
```

---

## Frontend Tests

### Інструменти
```bash
cd frontend
npm install -D @testing-library/react @testing-library/user-event @testing-library/jest-dom
npm install -D vitest jsdom
```

### vitest.config.ts (frontend)
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})
```

### src/test/setup.ts
```typescript
import '@testing-library/jest-dom'
```

---

### Test: StatusBadge Component

**src/components/ui/__tests__/Badge.test.tsx**

```tsx
import { render, screen } from '@testing-library/react'
import { Badge } from '../Badge'

describe('StatusBadge', () => {
  it('renders PAID with green styling', () => {
    render(<Badge status="PAID" />)
    const badge = screen.getByText('PAID')
    expect(badge).toHaveClass('bg-green-100')
  })

  it('renders OVERDUE with red styling', () => {
    render(<Badge status="OVERDUE" />)
    expect(screen.getByText('OVERDUE')).toHaveClass('bg-red-100')
  })

  it('renders UNPAID with yellow styling', () => {
    render(<Badge status="UNPAID" />)
    expect(screen.getByText('UNPAID')).toHaveClass('bg-yellow-100')
  })
})
```

---

### Test: Invoice Form Validation

**src/pages/invoices/__tests__/InvoiceForm.test.tsx**

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { InvoiceFormPage } from '../InvoiceFormPage'

describe('InvoiceFormPage', () => {
  const renderForm = () =>
    render(
      <MemoryRouter initialEntries={['/invoices/new']}>
        <InvoiceFormPage />
      </MemoryRouter>
    )

  it('shows validation error when clientName is empty', async () => {
    renderForm()
    fireEvent.click(screen.getByText('Save Invoice'))
    await waitFor(() => {
      expect(screen.getByText(/client name is required/i)).toBeInTheDocument()
    })
  })

  it('calculates total automatically when qty and price are entered', async () => {
    renderForm()
    const qtyInput = screen.getByLabelText(/quantity/i)
    const priceInput = screen.getByLabelText(/unit price/i)
    await userEvent.clear(qtyInput)
    await userEvent.type(qtyInput, '5')
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '100')
    expect(screen.getByText('$500.00')).toBeInTheDocument()
  })

  it('adds new line item when clicking "+ Add Item"', async () => {
    renderForm()
    const initialRows = screen.getAllByLabelText(/description/i)
    fireEvent.click(screen.getByText('+ Add Item'))
    const newRows = screen.getAllByLabelText(/description/i)
    expect(newRows.length).toBe(initialRows.length + 1)
  })
})
```

---

### Test: formatters utility

**src/utils/__tests__/formatters.test.ts**

```typescript
import { formatCurrency, formatDate, formatInvoiceNumber } from '../formatters'

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1500)).toBe('$1,500.00')
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(1500000)).toBe('$1,500,000.00')
  })

  it('formats EUR correctly', () => {
    expect(formatCurrency(1500, 'EUR')).toContain('1,500.00')
  })
})

describe('formatDate', () => {
  it('formats date string to readable format', () => {
    expect(formatDate('2026-03-15')).toBe('Mar 15, 2026')
  })
})
```

---

## Запуск тестів

```bash
# Backend
cd backend
npm run test:run          # один раз
npm run test              # watch mode
npm run test:coverage     # з coverage repor

# Frontend
cd frontend
npm run test:run
npm run test:coverage
```

**Очікуване покриття після написання всіх тестів:**
| Модуль | Покриття |
|--------|---------|
| src/routes/auth.ts | ~90% |
| src/routes/invoices.ts | ~85% |
| src/routes/dashboard.ts | ~80% |
| src/services/invoiceService.ts | ~95% |
| src/utils/formatters.ts | 100% |
| src/components/ui/Badge.tsx | 100% |
| src/pages/invoices/InvoiceFormPage.tsx | ~60% |

---

## Чеклист

- [ ] `npm run test:run` в backend → всі тести зелені
- [ ] `npm run test:run` в frontend → всі тести зелені
- [ ] Auth: register, login, me, logout покриті
- [ ] Invoices: create (з валідацією), list (з фільтром), update status, delete (role check) покриті
- [ ] Dashboard: summary і revenue покриті
- [ ] Business logic: calculateTotal, isOverdue, formatInvoiceNumber покриті
- [ ] Frontend: Badge, InvoiceForm validation, formatters покриті
- [ ] Немає тестів які тестують Prisma напряму (мок або тестова DB)

---

## Примітка про тестову БД

Для інтеграційних тестів краще використовувати окрему тестову БД щоб не псувати dev дані:

```env
# .env.test
DATABASE_URL="postgresql://postgres:password@localhost:5432/invoicedb_test"
```

```bash
# Перед запуском тестів
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx prisma db seed
npm run test:run
```

Або ще простіше — мокувати Prisma client у тестах через `vi.mock('../lib/prisma')`.
