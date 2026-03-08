# Phase 2 — Frontend Foundation

## Мета фази
Побудувати React додаток з навігацією, автентифікацією, сторінкою інвойсів з таблицею, фільтрами і формою створення/редагування.

## Передумова
Phase 1 завершена. Бекенд запущений на `http://localhost:3000`.

## Результат фази
Запущений локально React додаток на `http://localhost:5173` де можна:
- Залогінитися
- Бачити список інвойсів з фільтрами
- Створювати та редагувати інвойси

---

## Крок 7 — Ініціалізація Frontend

### Структура папок
```
invoice-dashboard/
  frontend/
    src/
      api/
      components/
        ui/
        layout/
      contexts/
      pages/
        auth/
        invoices/
        dashboard/
      hooks/
      types/
      utils/
    index.html
    vite.config.ts
    tailwind.config.js
    package.json
    tsconfig.json
```

### Команди
```bash
cd "invoice-dashboard"
npm create vite@latest frontend -- --template react-ts
cd frontend
```

### Залежності для встановлення
```bash
npm install react-router-dom axios
npm install recharts
npm install @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### tailwind.config.js
```js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        danger: '#EF4444',
        success: '#10B981',
        warning: '#F59E0B',
      }
    },
  },
  plugins: [],
}
```

### src/index.css (додати на початок)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
})
```

---

## Крок 8 — TypeScript Types

### src/types/index.ts
```typescript
export type Role = 'ADMIN' | 'MEMBER'
export type InvoiceStatus = 'PAID' | 'UNPAID' | 'OVERDUE'
export type RevenuePeriod = 'week' | 'month' | 'quarter' | 'year'

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  clientName: string
  clientEmail?: string
  items: InvoiceItem[]
  totalAmount: number
  currency: string
  dueDate: string
  status: InvoiceStatus
  notes?: string
  createdBy: User
  createdAt: string
  updatedAt: string
}

export interface DashboardSummary {
  outstanding: number
  overdue: number
  paidThisMonth: number
  totalInvoices: number
}

export interface RevenueDataPoint {
  label: string
  amount: number
}

export interface InvoiceFilters {
  status?: InvoiceStatus | 'ALL'
  client?: string
  from?: string
  to?: string
  sort?: keyof Invoice
  order?: 'asc' | 'desc'
}
```

---

## Крок 9 — API Layer

### src/api/client.ts
```typescript
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // надсилає cookies
})

// Interceptor для 401 → редірект на /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### src/api/auth.ts
```typescript
import api from './client'
import { User } from '../types'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ user: User }>('/auth/login', { email, password }),

  register: (email: string, password: string, name: string) =>
    api.post<{ user: User, token: string }>('/auth/register', { email, password, name }),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me'),
}
```

### src/api/invoices.ts
```typescript
import api from './client'
import { Invoice, InvoiceFilters } from '../types'

export const invoicesApi = {
  getAll: (filters?: InvoiceFilters) =>
    api.get<Invoice[]>('/invoices', { params: filters }),

  getOne: (id: string) =>
    api.get<Invoice>(`/invoices/${id}`),

  create: (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdBy' | 'createdAt' | 'updatedAt'>) =>
    api.post<Invoice>('/invoices', data),

  update: (id: string, data: Partial<Invoice>) =>
    api.put<Invoice>(`/invoices/${id}`, data),

  updateStatus: (id: string, status: 'PAID' | 'UNPAID') =>
    api.patch<Invoice>(`/invoices/${id}/status`, { status }),

  delete: (id: string) =>
    api.delete(`/invoices/${id}`),
}
```

### src/api/dashboard.ts
```typescript
import api from './client'
import { DashboardSummary, RevenueDataPoint, RevenuePeriod } from '../types'

export const dashboardApi = {
  getSummary: () => api.get<DashboardSummary>('/dashboard/summary'),
  getRevenue: (period: RevenuePeriod) =>
    api.get<RevenueDataPoint[]>('/dashboard/revenue', { params: { period } }),
}
```

---

## Крок 10 — Auth Context

### src/contexts/AuthContext.tsx
```typescript
// Зберігає: user (User | null), isLoading (bool)
// Методи: login(email, password), logout(), checkAuth()
// При завантаженні додатку → викликає /api/auth/me
// Якщо 401 → user = null (не залогінений)
// Надає useAuth() хук
```

**Логіка:**
1. `checkAuth()` — викликається при Mount. Якщо `/api/auth/me` повертає user → зберігаємо. Якщо 401 → user = null.
2. `login()` — викликає `authApi.login()`, зберігає user в state.
3. `logout()` — викликає `authApi.logout()`, скидає user = null, редіректить на /login.

---

## Крок 11 — Layout і Router

### src/App.tsx
```typescript
// React Router setup:
// / → PrivateRoute → DashboardPage
// /invoices → PrivateRoute → InvoicesPage
// /invoices/new → PrivateRoute → InvoiceFormPage
// /invoices/:id → PrivateRoute → InvoiceDetailPage
// /invoices/:id/edit → PrivateRoute → InvoiceFormPage
// /login → LoginPage

// PrivateRoute: якщо user === null → редірект на /login
```

### src/components/layout/Sidebar.tsx
```
Ліва панель навігації:
- Логотип / назва "InvoiceApp"
- Навігаційні посилання:
  - 📊 Dashboard → /
  - 📄 Invoices → /invoices
- Внизу: ім'я юзера + роль + кнопка Logout
- Ширина: 240px, темна або світла
```

### src/components/layout/Layout.tsx
```typescript
// Wrapper: Sidebar (ліворуч) + main content area (праворуч)
// main: flex-1, overflow-y-auto, p-6
```

---

## Крок 12 — Invoices Page

### src/pages/invoices/InvoicesPage.tsx

**Компоненти на сторінці:**

#### Шапка сторінки
```
Title: "Invoices"
Button (праворуч): "+ New Invoice" → navigate('/invoices/new')
```

#### Панель фільтрів
```
Row з фільтрами:
- Status dropdown: All | Paid | Unpaid | Overdue
- Client input: text search
- From date: date picker
- To date: date picker
- Button: "Clear filters"
```

#### Таблиця (src/components/invoices/InvoicesTable.tsx)
| Колонка | Сортувана | Відображення |
|---------|-----------|-------------|
| Invoice # | ✅ | INV-001 |
| Client | ✅ | Acme Corp |
| Amount | ✅ | $1,500.00 |
| Due Date | ✅ | Mar 15, 2026 |
| Status | ❌ | Badge (кольоровий) |
| Created | ✅ | Feb 28, 2026 |
| Actions | ❌ | View / Edit / Mark Paid / Delete |

**Статус бейджи:**
- PAID → зелений фон `bg-green-100 text-green-800`
- UNPAID → жовтий `bg-yellow-100 text-yellow-800`
- OVERDUE → червоний `bg-red-100 text-red-800`

**Сортування:** клік на заголовок колонки → `sort=clientName&order=asc` → новий запит до API.

**Дії:**
- View → `navigate('/invoices/:id')`
- Edit → `navigate('/invoices/:id/edit')`
- Mark Paid → `invoicesApi.updateStatus(id, 'PAID')` → refetch
- Delete → confirm dialog → `invoicesApi.delete(id)` → refetch (тільки для ADMIN)

#### Стан "немає даних"
Якщо список порожній: показати зображення/іконку + "No invoices found. Create your first one."

---

## Крок 13 — Invoice Form Page

### src/pages/invoices/InvoiceFormPage.tsx

**Режими:**
- `/invoices/new` → форма створення (всі поля пусті)
- `/invoices/:id/edit` → форма редагування (завантажуємо дані, заповнюємо форму)

**Структура форми:**

```
Section 1: Client Info
  - Client Name* (text input)
  - Client Email (email input)

Section 2: Invoice Details
  - Due Date* (date input)
  - Currency (select: USD, EUR, GBP, SEK)
  - Status (select: UNPAID, PAID) — тільки при редагуванні

Section 3: Line Items
  Table з колонками: Description | Qty | Unit Price | Total | [Delete]
  Для кожного рядка:
    - description: text input
    - quantity: number input (min 1)
    - unitPrice: number input (min 0)
    - total: readonly (qty * unitPrice, авто-розраховується)
  
  Кнопка "＋ Add Item" — додає порожній рядок
  Кнопка [✕] — видаляє рядок (мін 1 рядок)
  
  Summary row (внизу таблиці):
    Total: $1,500.00 (жирний, авто-розраховується)

Section 4: Notes
  - Textarea, 4 рядки, placeholder "Optional notes..."

Buttons:
  - "Cancel" → navigate back
  - "Save Invoice" (primary) → submit
```

**Валідація:**
- clientName: обов'язковий, мін 2 символи
- items: мінімум 1 item
- кожен item: description обов'язковий, qty > 0, unitPrice >= 0
- dueDate: обов'язковий

**Submit логіка:**
1. Validate → показати помилки під полями якщо є
2. Розрахувати totalAmount = сума всіх (qty * unitPrice)
3. Якщо create → `invoicesApi.create(data)` → navigate('/invoices')
4. Якщо edit → `invoicesApi.update(id, data)` → navigate('/invoices/:id')
5. Показати loading стан на кнопці під час запиту
6. Показати error toast якщо API повернув помилку

---

## UI Компоненти (src/components/ui/)

Прості reusable компоненти на Tailwind:

| Файл | Що робить |
|------|-----------|
| `Button.tsx` | Variant: primary / secondary / danger. Size: sm / md / lg. Loading state. |
| `Input.tsx` | Text/email/date/number input з label і error message |
| `Select.tsx` | Dropdown select з label і error |
| `Badge.tsx` | Кольоровий бейдж для статусів |
| `Card.tsx` | Білий блок з тінню і рамкою (`rounded-lg shadow p-6`) |
| `Modal.tsx` | Підтвердження видалення (overlay + dialog) |
| `Spinner.tsx` | Loading spinner |
| `Toast.tsx` | Сповіщення про успіх/помилку (з'являється зверху і зникає за 3с) |

---

## Чеклист перевірки фази

- [ ] `npm run dev` запускається без помилок
- [ ] Відкрити `/login` → показується форма
- [ ] Залогінитися з `admin@test.com / password123` → редірект на /
- [ ] Sidebar відображається з навігацією і іменем юзера
- [ ] Перейти на /invoices → показується таблиця з інвойсами
- [ ] Фільтр по Status → список оновлюється
- [ ] Клік на заголовок колонки → сортування
- [ ] Кнопка "+ New Invoice" → відкривається форма
- [ ] Заповнити форму → Submit → новий інвойс з'являється в списку
- [ ] "Mark as Paid" → статус оновлюється
- [ ] Edit → форма заповнена поточними даними → зберігаємо → зміни відображаються
- [ ] Logout → редірект на /login

## Готово → переходимо до Phase 3
