# Phase 4 — Deploy

## Мета фази
Задеплоїти бекенд і базу даних на Railway, фронтенд на Vercel. Проєкт доступний по публічному URL.

## Передумова
Phase 1–3 завершені. Все працює локально.

## Результат фази
- Backend API: `https://invoice-dashboard-api.up.railway.app`
- Frontend: `https://invoice-dashboard-xyz.vercel.app`
- Ці URL вставиш в Upwork portfolio як демо

---

## Крок 20 — Підготовка Backend до Deploy

### Environment Variables (.env.production)

Не комітимо цей файл. Змінні вводяться в Railway UI.

```
Потрібні змінні:
DATABASE_URL     — надає Railway автоматично при додаванні PostgreSQL addon
JWT_SECRET       — генеруємо: openssl rand -base64 32
JWT_EXPIRES_IN   — 7d
NODE_ENV         — production
PORT             — Railway виставляє автоматично через $PORT
```

### Оновити src/server.ts для продакшну
```typescript
// Замість hardcoded порту:
const port = Number(process.env.PORT) || 3000
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
await fastify.listen({ port, host })
```

### CORS оновлення
```typescript
// Замість 'http://localhost:5173':
fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
})
```

### Додати до змінних: `FRONTEND_URL=https://invoice-dashboard-xyz.vercel.app`

### Dockerfile (backend/)
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### package.json scripts (додати)
```json
"postinstall": "prisma generate",
"migrate:deploy": "prisma migrate deploy"
```

### .gitignore (backend/)
```
node_modules/
dist/
.env
.env.local
.env.production
```

---

## Крок 21 — Railway Deploy (Backend + PostgreSQL)

### Кроки в Railway UI:

**1. Створити акаунт**
- Зайти на `railway.app`
- Sign up через GitHub
- Безкоштовний план: $5 кредитів (вистачить на ~2 тижні тестування)

**2. New Project → Deploy from GitHub repo**
- Підключити GitHub акаунт
- Обрати репозиторій `invoice-dashboard`
- Обрати папку `backend` як root directory

**3. Додати PostgreSQL**
- В проєкті: "+ New" → "Database" → "Add PostgreSQL"
- Railway автоматично додасть `DATABASE_URL` в environment variables

**4. Environment Variables (Settings → Variables)**
Вручну додати:
```
JWT_SECRET=<згенерований рядок>
JWT_EXPIRES_IN=7d
NODE_ENV=production
FRONTEND_URL=https://ТВІЙ_VERCEL_URL.vercel.app
```
*(FRONTEND_URL додати після деплою фронтенду)*

**5. Deploy**
- Railway автоматично будує і деплоїть при push
- Слідкувати за логами в розділі "Deployments"

**6. Запустити міграції**
- В Railway: "Run Command" → `npx prisma migrate deploy`
- або: додати до Dockerfile CMD (вже є вище)

**7. Отримати URL**
- Settings → Networking → Generate Domain
- Скопіювати URL (напр. `invoice-api.up.railway.app`)

**8. Перевірити:**
```bash
curl https://invoice-api.up.railway.app/health
# Відповідь: {"status":"ok"}
```

---

## Крок 22 — Vercel Deploy (Frontend)

### Підготовка фронтенду

**vite.config.ts — оновити proxy для продакшну:**
```typescript
// Proxy потрібен тільки для dev. В продакшні використовуємо VITE_API_URL
```

**src/api/client.ts — оновити baseURL:**
```typescript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})
```

**frontend/.env.production:**
```
VITE_API_URL=https://invoice-api.up.railway.app/api
```

*(Цей файл можна закомітити, там немає секретів — тільки публічний URL)*

**vercel.json (frontend/):**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Кроки в Vercel UI:

**1. Акаунт**
- Зайти на `vercel.com`
- Sign up через GitHub (безкоштовно)

**2. New Project → Import Git Repository**
- Обрати репозиторій `invoice-dashboard`
- Root Directory: `frontend`
- Framework: Vite (Vercel визначить автоматично)

**3. Environment Variables**
```
VITE_API_URL = https://invoice-api.up.railway.app/api
```

**4. Deploy**
- Click "Deploy"
- Зачекати ~2 хвилини

**5. Отримати URL**
- Vercel дасть URL типу `invoice-dashboard-abc123.vercel.app`
- Можна додати власний домен (опціонально)

**6. Оновити FRONTEND_URL в Railway**
- Повернутися в Railway
- Settings → Variables → `FRONTEND_URL=https://invoice-dashboard-abc123.vercel.app`
- Redeploy backend

---

## Крок 23 — End-to-End тест

Протестувати повний flow на продакшн URL:

### Тест 1: Реєстрація і логін
```
1. Відкрити https://invoice-dashboard-abc123.vercel.app
2. Перенаправляє на /login ✅
3. Ввести admin@test.com / password123 ✅
4. Редірект на / (dashboard) ✅
5. Бачимо цифри в картках ✅
```

### Тест 2: Створити інвойс
```
1. Перейти на /invoices
2. Клік "+ New Invoice"
3. Заповнити: Client = "Test Client", Due Date = завтра
4. Додати item: "Consulting", qty 5, price $200
5. Total = $1,000.00 (авто) ✅
6. Save → редірект на /invoices
7. Новий інвойс INV-XXX в списку ✅
```

### Тест 3: Фільтри і сортування
```
1. /invoices → фільтр Status = "UNPAID" → показує тільки UNPAID ✅
2. Клік на "Amount" header → сортує ✅
3. Очистити фільтри → всі інвойси ✅
```

### Тест 4: Dashboard
```
1. / → бачимо Summary cards з даними ✅
2. Revenue chart → клік "Year" → оновлюється ✅
3. Recent invoices → показує 5 останніх ✅
```

### Тест 5: Overdue авто-визначення
```
1. Створити інвойс з dueDate = вчора
2. Зберегти (статус UNPAID)
3. Перейти на /invoices
4. Статус автоматично OVERDUE ✅
```

### Тест 6: Логаут
```
1. Клік "Logout" в sidebar
2. Редірект на /login ✅
3. Спробувати відкрити /invoices → редірект на /login ✅
```

---

## Чеклист деплою

### Railway (Backend)
- [ ] `GET /health` повертає 200
- [ ] `POST /api/auth/login` повертає token
- [ ] `GET /api/invoices` повертає список (з auth)
- [ ] Логи в Railway не показують помилок
- [ ] PostgreSQL addon підключений і міграції застосовані

### Vercel (Frontend)
- [ ] Головна сторінка відкривається
- [ ] API запити йдуть на Railway (перевірити Network tab в DevTools)
- [ ] Cookies встановлюються (перевірити Application → Cookies в DevTools)
- [ ] CORS помилок немає в консолі
- [ ] Build завершився без помилок

### End-to-End
- [ ] Повний flow (register → login → create → view → logout) працює на проді
- [ ] Мобільний вигляд коректний (відкрити на телефоні)

---

## Якщо щось не працює

### CORS помилка в браузері
```
Access to XMLHttpRequest at '...' has been blocked by CORS policy
```
→ Перевірити `FRONTEND_URL` в Railway Environment Variables
→ Перевірити що CORS плагін використовує `process.env.FRONTEND_URL`
→ Redeploy backend

### 401 Unauthorized на продакшні
→ Cookie `Secure` flag — в продакшні потрібен HTTPS
```typescript
reply.setCookie('token', jwt, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // true на Railway
  sameSite: 'none', // потрібно для cross-origin cookies
})
```

### Blank page на Vercel
→ Відкрити DevTools → Console → знайти помилку
→ Перевірити що `VITE_API_URL` прописаний в Vercel Environment Variables
→ Redeploy frontend

### Railway build failed
→ Перевірити що `prisma generate` виконується під час build
→ Перевірити що всі npm dependencies в `dependencies` (не `devDependencies`)

---

## Після успішного деплою

### Де вставити посилання:

**Upwork Portfolio:**
- Назва: "Invoice Management Dashboard"
- URL: `https://invoice-dashboard-abc123.vercel.app`
- Screenshot: зробити скріншот дашборду з цифрами і графіком
- Опис (500 chars):
  > Full-stack invoice management app for a 5-person consulting firm. React + Fastify + PostgreSQL. Features: invoice CRUD with dynamic line items, status tracking (Paid/Unpaid/Overdue), revenue dashboard with weekly/monthly/yearly charts, JWT auth with role-based access. Auto-detects overdue invoices. Deployed on Railway + Vercel.

**GitHub:**
```bash
cd invoice-dashboard
git init
git add .
git commit -m "Invoice Dashboard — full-stack invoice management app"
git remote add origin https://github.com/globoohotron-rgb/invoice-dashboard.git
git push -u origin main
```

**Fiverr гіг:**
- Використати screenshot дашборду як preview image
- Посилання на живе демо в описі гігу
