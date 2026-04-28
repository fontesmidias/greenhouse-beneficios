FROM node:20-alpine AS base

# Dependências
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Imagem de produção
FROM base AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Injeta a CLI do Prisma e os schemas para rodarmos as migrações na montagem do volume
COPY --from=builder /app/prisma ./prisma
RUN npm install -g prisma@5.22.0

EXPOSE 3000

ENV PORT=3000

# Next.js standalone runner.
# Aplica migrations versionadas (idempotente, não destrutivo) antes de subir o server.
# NUNCA voltar para `prisma db push` — esse comando é de prototipagem e dropa colunas
# em mudanças incompatíveis de schema. Runbook do incidente: docs/ROLLOUT_FIX_DBPUSH.md
CMD npx prisma migrate deploy && node server.js
