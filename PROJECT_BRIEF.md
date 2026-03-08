# Invoice Dashboard — Project Brief

## Goal
Build a full-stack invoice management web application for a small consulting firm (5 people) replacing their Google Sheets workflow.

## Tech Stack
- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Node.js + Fastify + TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (access + refresh tokens)
- **Charts:** Recharts
- **Styling:** Tailwind CSS
- **Deploy:** Railway (backend + DB) + Vercel (frontend)

---

## Database Schema

### User
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| email | String | Unique |
| passwordHash | String | bcrypt |
| name | String | Display name |
| role | Enum | ADMIN, MEMBER |
| createdAt | DateTime | Auto |

### Invoice
| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| invoiceNumber | String | Auto-generated (INV-001) |
| clientName | String | Required |
| clientEmail | String | Optional |
| items | JSON | Array of {description, quantity, unitPrice, total} |
| totalAmount | Decimal | Computed from items |
| currency | String | Default "USD" |
| dueDate | DateTime | Required |
| status | Enum | PAID, UNPAID, OVERDUE |
| notes | String | Optional, free text |
| createdBy | UUID | FK → User |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |

---

## Pages

### 1. Login Page (`/login`)
- Email + password form
- JWT stored in httpOnly cookie
- Redirect to dashboard after login

### 2. Dashboard (`/`)
- **Summary cards (top row):**
  - Total Outstanding (sum of UNPAID + OVERDUE)
  - Total Overdue (sum of OVERDUE only)
  - Paid This Month
  - Total Invoices count
- **Revenue chart:**
  - Bar/line chart showing revenue over time
  - Toggle: weekly / monthly / quarterly / yearly
- **Recent invoices** — last 5 invoices quick list

### 3. Invoices (`/invoices`)
- **Table columns:** Invoice #, Client, Amount, Due Date, Status, Created
- **Filters:**
  - Status: All / Paid / Unpaid / Overdue
  - Client: dropdown or search
  - Date range: from — to
- **Sort:** by any column (click header)
- **Actions:** View, Edit, Delete, Mark as Paid
- **Button:** "+ New Invoice" → opens create form

### 4. Invoice Create/Edit (`/invoices/new`, `/invoices/:id/edit`)
- Form fields: client name, client email, due date, currency
- Dynamic line items: description, quantity, unit price (auto-calc total)
- Add/remove line items
- Notes textarea
- Save → redirects to invoices list

### 5. Invoice Detail (`/invoices/:id`)
- Full invoice view (printable layout)
- Status badge
- Action buttons: Edit, Mark Paid, Delete

---

## API Routes

### Auth
```
POST /api/auth/register   — { email, password, name } → token
POST /api/auth/login      — { email, password } → token
POST /api/auth/logout     — clear token
GET  /api/auth/me          — current user
```

### Invoices
```
GET    /api/invoices        — list (with filters: ?status=&client=&from=&to=)
GET    /api/invoices/:id    — single invoice
POST   /api/invoices        — create
PUT    /api/invoices/:id    — update
DELETE /api/invoices/:id    — delete
PATCH  /api/invoices/:id/status — { status: "PAID" | "UNPAID" }
```

### Dashboard
```
GET /api/dashboard/summary  — totals (outstanding, overdue, paid this month, count)
GET /api/dashboard/revenue  — revenue data (?period=week|month|quarter|year)
```

---

## Business Logic
1. **Auto-overdue:** Cron job or on-request check — if dueDate < today AND status = UNPAID → mark as OVERDUE
2. **Invoice number:** Auto-increment per creation (INV-001, INV-002...)
3. **Total calculation:** Server-side recalculates totalAmount from items on save
4. **Authorization:** All routes require valid JWT. ADMIN can delete invoices, MEMBER cannot.

---

## Build Order

### Phase 1 — Backend Foundation
1. Init project: `npm init`, install fastify, prisma, typescript
2. Prisma schema + `npx prisma migrate dev`
3. Seed script: create admin user + 10 sample invoices
4. Auth routes (register, login, me)
5. Invoice CRUD routes
6. Dashboard aggregation routes

### Phase 2 — Frontend Foundation
7. `npm create vite@latest` with React + TypeScript
8. Install tailwind, recharts, react-router-dom, axios
9. Layout: sidebar nav + main content area
10. Login page + auth context (store JWT)
11. Invoices list page with table
12. Filters (status, client, date range)
13. Create/edit invoice form with dynamic line items

### Phase 3 — Dashboard & Polish
14. Dashboard page with summary cards
15. Revenue chart with period toggle
16. Invoice detail page (printable)
17. Auto-overdue logic
18. Responsive design (mobile-friendly)
19. Error handling + loading states

### Phase 4 — Deploy
20. Backend → Railway (with PostgreSQL addon)
21. Frontend → Vercel
22. Environment variables configured
23. Test full flow: register → login → create invoice → view dashboard

---

## Success Criteria
- [ ] User can register and login
- [ ] User can create invoice with line items
- [ ] Invoice list shows with working filters and sort
- [ ] Dashboard shows correct totals
- [ ] Revenue chart displays with period toggle
- [ ] Overdue invoices auto-detected
- [ ] Deployed and accessible via URL
