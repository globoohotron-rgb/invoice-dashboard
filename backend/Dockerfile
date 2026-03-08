FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build

RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "timeout 30 npx prisma migrate deploy || true; node dist/server.js"]
