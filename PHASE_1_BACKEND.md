# Phase 1 — Backend Foundation

## Мета фази
Побудувати повноцінний бекенд: база даних, автентифікація, всі API роути для інвойсів і дашборду.

## Результат фази
Запущений локально Fastify сервер на `http://localhost:3000` з повним API, яке можна тестувати через Postman або curl.

---

## Крок 1 — Ініціалізація проєкту

### Структура папок
```
invoice-dashboard/
  backend/
    src/
      routes/
      plugins/
      services/
    prisma/
      schema.prisma
      seed.ts
    .env
    package.json
    tsconfig.json
```

### Команди
```bash
mkdir -p "invoice-dashboard/backend/src/routes"
mkdir -p "invoice-dashboard/backend/src/plugins"
mkdir -p "invoice-dashboard/backend/src/services"
mkdir -p "invoice-dashboard/backend/prisma"
cd invoice-dashboard/backend
npm init -y
```

### Залежності для встановлення
```bash
npm install fastify @fastify/jwt @fastify/cookie @fastify/cors
npm install @prisma/client bcryptjs
npm install -D prisma typescript ts-node @types/node @types/bcryptjs
npm install -D nodemon tsx
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*", "prisma/seed.ts"]
}
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

### .env
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/invoicedb"
JWT_SECRET="your-super-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV=development
```

---

## Крок 2 — Prisma Schema

### prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  name         String
  role         Role      @default(MEMBER)
  invoices     Invoice[]
  createdAt    DateTime  @default(now())
}

enum Role {
  ADMIN
  MEMBER
}

model Invoice {
  id            String        @id @default(uuid())
  invoiceNumber String        @unique
  clientName    String
  clientEmail   String?
  items         Json
  totalAmount   Decimal       @db.Decimal(10, 2)
  currency      String        @default("USD")
  dueDate       DateTime
  status        InvoiceStatus @default(UNPAID)
  notes         String?
  createdById   String
  createdBy     User          @relation(fields: [createdById], references: [id])
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

enum InvoiceStatus {
  PAID
  UNPAID
  OVERDUE
}
```

### Команди після schema
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Крок 3 — Seed Script

### prisma/seed.ts
Цей файл створює тестові дані для розробки:
- 1 адмін акаунт: `admin@test.com` / `password123`
- 1 мембер акаунт: `member@test.com` / `password123`
- 15 інвойсів з різними статусами (PAID, UNPAID, OVERDUE), різними клієнтами, різними сумами

```bash
# Запуск seed
npm run db:seed
```

**Що повинен зробити AI:** Написати повний seed.ts з реалістичними даними (5 різних клієнтів, інвойси за останні 3 місяці, мікс статусів).

---

## Крок 4 — Fastify Server Entry Point

### src/server.ts
```typescript
import Fastify from 'fastify'
import { PrismaClient } from '@prisma/client'

const fastify = Fastify({ logger: true })
const prisma = new PrismaClient()

// Plugins
fastify.register(require('@fastify/cors'), { origin: 'http://localhost:5173' })
fastify.register(require('@fastify/jwt'), { secret: process.env.JWT_SECRET! })
fastify.register(require('@fastify/cookie'))

// Routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' })
fastify.register(require('./routes/invoices'), { prefix: '/api/invoices' })
fastify.register(require('./routes/dashboard'), { prefix: '/api/dashboard' })

// Health check
fastify.get('/health', () => ({ status: 'ok' }))

const start = async () => {
  await fastify.listen({ port: Number(process.env.PORT) || 3000 })
  console.log('Server running on http://localhost:3000')
}
start()
```

---

## Крок 5 — Auth Routes

### src/routes/auth.ts

**Ендпоінти:**

#### POST /api/auth/register
- Вхід: `{ email, password, name }`
- Валідація: email унікальний, password мін 8 символів
- Хешуємо пароль через `bcrypt.hash(password, 12)`
- Повертаємо: `{ user: { id, email, name, role }, token }`

#### POST /api/auth/login
- Вхід: `{ email, password }`
- Знаходимо user по email
- `bcrypt.compare(password, passwordHash)`
- Генеруємо JWT: `fastify.jwt.sign({ userId, role })`
- Зберігаємо в httpOnly cookie: `reply.setCookie('token', jwt, { httpOnly: true, secure: false })`
- Повертаємо: `{ user: { id, email, name, role } }`

#### POST /api/auth/logout
- Очищаємо cookie
- Повертаємо: `{ message: 'Logged out' }`

#### GET /api/auth/me
- Потребує auth (перевіряємо JWT з cookie)
- Повертаємо поточного user

**Auth middleware (src/plugins/auth.ts):**
```typescript
// Перевіряє JWT з cookie або Authorization header
// Додає request.user = { userId, role }
// Повертає 401 якщо токен відсутній або невалідний
```

---

## Крок 6 — Invoice Routes

### src/routes/invoices.ts

**Всі роути потребують аутентифікації.**

#### GET /api/invoices
Query параметри: `?status=PAID&client=Acme&from=2026-01-01&to=2026-03-31&sort=dueDate&order=asc`

Логіка:
1. Будуємо Prisma `where` clause з фільтрів
2. Викликаємо `prisma.invoice.findMany({ where, orderBy, include: { createdBy: true } })`
3. Для кожного інвойсу перевіряємо auto-overdue (dueDate < now && status === UNPAID → OVERDUE)
4. Повертаємо масив інвойсів

#### GET /api/invoices/:id
- `prisma.invoice.findUnique({ where: { id }, include: { createdBy: true } })`
- 404 якщо не знайдено

#### POST /api/invoices
Вхід:
```json
{
  "clientName": "Acme Corp",
  "clientEmail": "billing@acme.com",
  "items": [
    { "description": "Development", "quantity": 10, "unitPrice": 150 }
  ],
  "dueDate": "2026-04-01",
  "currency": "USD",
  "notes": "Net 30"
}
```
Логіка:
1. Генеруємо invoiceNumber: знаходимо останній номер + 1, форматуємо `INV-001`
2. Обчислюємо totalAmount: сума всіх `quantity * unitPrice`
3. Встановлюємо `createdById` з JWT токена
4. `prisma.invoice.create(...)`

#### PUT /api/invoices/:id
- Оновлюємо поля (без invoiceNumber і createdBy)
- Перераховуємо totalAmount
- `prisma.invoice.update(...)`

#### PATCH /api/invoices/:id/status
Вхід: `{ "status": "PAID" }`
- Тільки PAID або UNPAID (OVERDUE виставляється автоматично)
- `prisma.invoice.update({ where: { id }, data: { status } })`

#### DELETE /api/invoices/:id
- Тільки ADMIN може видаляти (перевіряємо `request.user.role === 'ADMIN'`)
- 403 якщо MEMBER

---

## Крок 7 — Dashboard Routes

### src/routes/dashboard.ts

#### GET /api/dashboard/summary
Розраховуємо через Prisma aggregate:

```typescript
const [outstanding, overdue, paidThisMonth, total] = await Promise.all([
  // UNPAID + OVERDUE сума
  prisma.invoice.aggregate({
    where: { status: { in: ['UNPAID', 'OVERDUE'] } },
    _sum: { totalAmount: true }
  }),
  // OVERDUE сума
  prisma.invoice.aggregate({
    where: { status: 'OVERDUE' },
    _sum: { totalAmount: true }
  }),
  // PAID цього місяця
  prisma.invoice.aggregate({
    where: {
      status: 'PAID',
      updatedAt: { gte: startOfMonth }
    },
    _sum: { totalAmount: true }
  }),
  // Загальна кількість
  prisma.invoice.count()
])
```

Відповідь:
```json
{
  "outstanding": 15400.00,
  "overdue": 3200.00,
  "paidThisMonth": 8750.00,
  "totalInvoices": 47
}
```

#### GET /api/dashboard/revenue?period=month
Параметри: `week | month | quarter | year`

Логіка:
- `week` → дані по днях за останні 7 днів
- `month` → дані по тижнях за останні 30 днів
- `quarter` → дані по місяцях за останні 90 днів
- `year` → дані по місяцях за останні 12 місяців

```typescript
// Отримуємо всі PAID інвойси за потрібний період
// Групуємо в JavaScript по потрібному інтервалу
// Повертаємо масив { label: "Jan", amount: 4500.00 }
```

---

## Чеклист перевірки фази

Після завершення перевір кожен пункт через curl або Postman:

```bash
# Health check
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}' \
  -c cookies.txt

# Get invoices (з cookie)
curl http://localhost:3000/api/invoices -b cookies.txt

# Create invoice
curl -X POST http://localhost:3000/api/invoices \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"clientName":"Acme","items":[{"description":"Dev","quantity":5,"unitPrice":100}],"dueDate":"2026-04-01"}'

# Dashboard summary
curl http://localhost:3000/api/dashboard/summary -b cookies.txt

# Dashboard revenue
curl "http://localhost:3000/api/dashboard/revenue?period=month" -b cookies.txt
```

- [ ] Server стартує без помилок
- [ ] Register повертає token
- [ ] Login встановлює cookie
- [ ] GET /api/invoices повертає список
- [ ] POST /api/invoices створює інвойс з правильним номером
- [ ] Dashboard summary повертає правильні суми
- [ ] Dashboard revenue повертає масив даних
- [ ] DELETE /api/invoices/:id повертає 403 для MEMBER

## Готово → переходимо до Phase 2
