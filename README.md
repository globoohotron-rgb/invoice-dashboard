# Invoice Dashboard

Full-stack invoice management app for a small consulting firm, replacing a Google Sheets workflow. Built with TypeScript end-to-end.

**Live demo:** [invoice-dashboard-olive.vercel.app](https://invoice-dashboard-olive.vercel.app/)

---

## Features

- **Dashboard** — revenue charts (weekly/monthly/quarterly/yearly), outstanding & overdue totals, recent invoices
- **Invoices** — full CRUD with dynamic line items, status lifecycle (unpaid → paid / overdue), filtering by status/client/date range, sortable columns
- **Auth** — JWT with httpOnly cookies, role-based access (admin/member)
- **PDF-ready** — printable invoice detail view

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, Recharts |
| Backend | Fastify, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens), bcrypt |
| Deploy | Vercel (frontend) + Railway (backend + DB) |
| Testing | Vitest |

## Project Structure

```
invoice-dashboard/
├── backend/
│   ├── prisma/          # Schema, migrations, seed
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── services/    # Business logic
│   │   ├── lib/         # Prisma client, utilities
│   │   └── types/       # Shared types
│   └── tests/           # API & unit tests
├── frontend/
│   ├── src/
│   │   ├── pages/       # Login, Dashboard, Invoices, Invoice Detail
│   │   ├── components/  # Shared UI components
│   │   ├── contexts/    # Auth context
│   │   ├── api/         # API client
│   │   └── utils/       # Helpers
│   └── tests/
```

## API

```
POST /api/auth/register    — create account
POST /api/auth/login       — get JWT
POST /api/auth/logout      — clear token
GET  /api/auth/me          — current user

GET    /api/invoices       — list (filter, sort, paginate)
POST   /api/invoices       — create
GET    /api/invoices/:id   — detail
PUT    /api/invoices/:id   — update
DELETE /api/invoices/:id   — delete
PATCH  /api/invoices/:id/status — mark paid/unpaid
```

## Getting Started

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev              # http://localhost:3000

# Frontend
cd frontend
npm install
npm run dev              # http://localhost:5173
```

## License

MIT
