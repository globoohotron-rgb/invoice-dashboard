FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build && npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy; node dist/server.js"]
