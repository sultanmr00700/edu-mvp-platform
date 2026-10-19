FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build || echo "skip build in dev"
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/index.js"]
