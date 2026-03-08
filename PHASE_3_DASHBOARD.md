# Phase 3 — Dashboard & Polish

## Мета фази
Побудувати головний дашборд з графіками, сторінку деталей інвойсу, авто-визначення overdue, responsive дизайн та обробку помилок.

## Передумова
Phase 1 і Phase 2 завершені. Таблиця інвойсів і форма працюють.

## Результат фази
Повноцінний продакшн-готовий UI: дашборд з живими цифрами і графіком, деталі інвойсу в друкованому форматі, все виглядає добре на мобільному.

---

## Крок 14 — Dashboard Page

### src/pages/dashboard/DashboardPage.tsx

**Структура сторінки:**

```
Header: "Dashboard"
Subheader: "Today's date: March 8, 2026"

Row 1 — Summary Cards (4 штуки в ряд):
  [Total Outstanding] [Total Overdue] [Paid This Month] [Total Invoices]

Row 2 — Revenue Chart (full width)

Row 3 — Recent Invoices (last 5, mini-table)
```

---

### src/components/dashboard/SummaryCards.tsx

Чотири картки в ряд (grid 4 колонки, на мобільному 2):

#### Картка 1: Total Outstanding
```
Іконка: 💰 (або SVG)
Label: "Outstanding"
Value: $15,400.00  (форматовано з тисячними розділювачами)
Субтекст: "Unpaid + Overdue"
Колір рамки: синій (border-l-4 border-blue-500)
```

#### Картка 2: Total Overdue
```
Іконка: ⚠️
Label: "Overdue"
Value: $3,200.00
Субтекст: "Past due date"
Колір рамки: червоний (border-l-4 border-red-500)
Якщо value > 0 → текст червоний
```

#### Картка 3: Paid This Month
```
Іконка: ✅
Label: "Paid This Month"
Value: $8,750.00
Субтекст: поточний місяць і рік (напр. "March 2026")
Колір рамки: зелений (border-l-4 border-green-500)
```

#### Картка 4: Total Invoices
```
Іконка: 📄
Label: "Total Invoices"
Value: 47  (число без $)
Субтекст: "All time"
Колір рамки: сірий (border-l-4 border-gray-400)
```

**Завантаження:** поки `dashboardApi.getSummary()` не завершився — показувати скелетон (сірий прямокутник замість цифри, анімований pulse).

---

### src/components/dashboard/RevenueChart.tsx

**Period Toggle (вверху блоку):**
```
Кнопки: [Week] [Month] [Quarter] [Year]
Активна кнопка → синій фон, інші — сірі
Клік → оновлює запит до /api/dashboard/revenue?period=X
```

**Графік (Recharts):**
```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Дані: [{ label: "Jan", amount: 4500 }, ...]
// X axis: labels (Jan, Feb... або Mon Tue... або Week 1...)
// Y axis: суми в $
// Bar: синій (#3B82F6)
// Tooltip: "$4,500.00" при hover
// Container: width="100%" height={300}
```

**Стан завантаження:** spinner по центру блоку.

**Стан "немає даних":** "No revenue data for this period."

---

### src/components/dashboard/RecentInvoices.tsx

Мінімальна таблиця з 5 останніх інвойсів:

| Invoice # | Client | Amount | Status | Due Date |
|-----------|--------|--------|--------|----------|
| INV-047 | Acme Corp | $1,500 | OVERDUE | Feb 28 |

- Клік на рядок → navigate('/invoices/:id')
- Footer: "View all invoices →" → navigate('/invoices')

---

## Крок 15 — Invoice Detail Page

### src/pages/invoices/InvoiceDetailPage.tsx

**Призначення:** Переглянути один інвойс у форматі близькому до PDF/друкованого документа.

**Структура сторінки:**

```
Header (web, не друкується):
  ← Back to Invoices    [Edit] [Mark Paid] [Delete] [🖨 Print]

Invoice Document (білий блок, shadow, max-w-3xl, mx-auto):
  
  Top Row:
    Ліворуч: "INVOICE"  (великими, жирний, синій)
    Праворуч: INV-047
              Status Badge (PAID/UNPAID/OVERDUE)
  
  Info Row:
    Ліворуч:              Праворуч:
    From:                 To:
    InvoiceApp            Acme Corp
    your@company.com      billing@acme.com
    
  Dates Row:
    Issue Date: Feb 28, 2026
    Due Date: Mar 28, 2026
    Currency: USD
  
  Items Table:
    Description | Qty | Unit Price | Total
    -------------------------------------------
    Development | 10  | $150.00    | $1,500.00
    Design      | 5   | $100.00    | $500.00
    -------------------------------------------
                               Total: $2,000.00
  
  Notes (якщо є):
    Notes:
    Net 30. Thank you for your business.
  
  Footer (маленький текст):
    Created by: John Admin | Created: Feb 28, 2026
```

**Кнопки дій:**
- **Edit** → navigate('/invoices/:id/edit')
- **Mark Paid** → `invoicesApi.updateStatus(id, 'PAID')` → refetch → статус оновлюється
- **Delete** → confirm modal → `invoicesApi.delete(id)` → navigate('/invoices')
- **Print** → `window.print()` — CSS `@media print { .no-print { display: none } }` приховає кнопки

---

## Крок 16 — Auto-Overdue Logic

### Backend (додати в src/services/invoiceService.ts)

```typescript
// Функція яка перевіряє і оновлює overdue статуси
async function syncOverdueStatus() {
  const now = new Date()
  await prisma.invoice.updateMany({
    where: {
      status: 'UNPAID',
      dueDate: { lt: now }
    },
    data: { status: 'OVERDUE' }
  })
}
```

**Де викликати:**
1. При кожному `GET /api/invoices` — перед поверненням списку
2. При `GET /api/invoices/:id` — перед поверненням одного інвойсу
3. При `GET /api/dashboard/summary` — перед розрахунком агрегатів

**Чому не cron:** Для MVP достатньо lazy evaluation (перевіряємо при запиті). Cron — оверенжиніринг.

---

## Крок 17 — Responsive Design

Перелік змін для мобільного вигляду:

### Sidebar на мобільному
```
- При ширині < 768px → sidebar прихований за замовчуванням
- Кнопка "☰" в шапці → відкриває/закриває sidebar (drawer з overlay)
- При відкритому sidebar → клік на посилання → sidebar закривається
```

### Summary Cards
```
grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

### Таблиця інвойсів на мобільному
```
- Замість таблиці → картки (card per invoice)
- Кожна картка: Invoice # + Client, Amount + Status, Due Date, Actions
- Переключення: table на desktop (md:), cards на mobile
```

### Форма інвойсу
```
- Line items таблиця → на мобільному стає вертикальним стеком
- Кожен item: поля зверху вниз замість в ряд
```

---

## Крок 18 — Error Handling і Loading States

### Global Error Boundary (src/components/ErrorBoundary.tsx)
```typescript
// React клас компонент
// componentDidCatch → зберігає помилку в state
// render: якщо є помилка → показати "Something went wrong" + кнопку Reload
```

### Toast система (src/components/ui/Toast.tsx + src/contexts/ToastContext.tsx)
```typescript
// Context надає showToast(message, type: 'success' | 'error' | 'info')
// Toast з'являється в правому нижньому куті
// Автоматично зникає через 3 секунди
// Можна закрити вручну (×)
```

**Де використовувати toasts:**
- ✅ "Invoice created successfully" — після POST
- ✅ "Invoice updated" — після PUT
- ✅ "Invoice deleted" — після DELETE
- ✅ "Marked as paid" — після PATCH status
- ❌ "Failed to load invoices" — після помилки GET (показати inline)
- ❌ "Login failed: invalid credentials" — на формі логіну (під полем)

### Loading states
| Компонент | Loading стан |
|-----------|-------------|
| Invoices table | Скелетон рядки (3-5 сірих рядків з pulse) |
| Dashboard cards | Pulse placeholder замість числа |
| Revenue chart | Spinner по центру блоку |
| Form submit | Кнопка: "Saving..." + disabled |
| Delete confirm | Кнопка: "Deleting..." + disabled |

### Empty states
| Компонент | Порожній стан |
|-----------|--------------|
| Invoices table | "No invoices found. Create your first one! [+ New Invoice]" |
| Revenue chart | "No revenue data for selected period." |
| Recent invoices | "No invoices yet." |

---

## Крок 19 — Final Polish

### Форматування чисел (src/utils/formatters.ts)
```typescript
export const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
// $1,500.00

export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
// Mar 15, 2026

export const formatInvoiceNumber = (n: number) =>
  `INV-${String(n).padStart(3, '0')}`
// INV-001
```

### Page titles
```typescript
// useEffect → document.title = 'Invoices | InvoiceApp'
// Різні titl для кожної сторінки
```

### Favicon і meta
```html
<!-- index.html -->
<title>InvoiceApp</title>
<meta name="description" content="Invoice management for small teams">
```

### Confirm Delete Modal
```
Заголовок: "Delete Invoice"
Текст: "Are you sure you want to delete INV-047? This action cannot be undone."
Кнопки: [Cancel] [Delete] (червона)
```

---

## Чеклист перевірки фази

- [ ] Dashboard відкривається і показує правильні цифри
- [ ] При зміні period (Week/Month/Quarter/Year) → графік оновлюється
- [ ] UNPAID інвойс з dueDate в минулому → автоматично OVERDUE
- [ ] Invoice Detail показує всі дані коректно
- [ ] window.print() відкриває друкований вигляд без кнопок
- [ ] На мобільному (375px) — нема горизонтального скролу
- [ ] Sidebar відкривається/закривається на мобільному
- [ ] Toast з'являється після дій (create, update, delete)
- [ ] Loading стан видно при повільному з'єднанні (Chrome DevTools → Slow 3G)
- [ ] Empty state видно коли видалити всі інвойси
- [ ] Confirm dialog з'являється перед видаленням

## Готово → переходимо до Phase 4
