# Build context is the REPO ROOT (see docker-compose.yml) so the shared
# prisma/ folder at the root is available to the image.
#
# ---- Build stage: install deps, generate Prisma client, compile TS ----
FROM node:18 AS builder
WORKDIR /app/backend
COPY prisma ./prisma
COPY backend/package*.json ./backend/
RUN cd backend && npm ci
RUN cd backend && npx prisma generate
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
RUN cd backend && npm run build

# ---- Runtime stage: production deps + compiled output ----
FROM node:18-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Prisma CLI is a production dependency (used for `migrate deploy` on boot)
COPY prisma ./prisma
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/backend/dist ./dist
# Reuse the generated Prisma client from the build stage
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma/client ./node_modules/@prisma/client

RUN mkdir -p uploads && chown -R node:node /app
USER node

EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
