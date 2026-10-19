# Build context is the REPO ROOT (see docker-compose.yml).
FROM node:18-alpine AS builder
WORKDIR /app/frontend
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM node:18-alpine AS runner
WORKDIR /app/frontend
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder /app/frontend/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/frontend/.next ./.next
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/package.json ./package.json
USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
