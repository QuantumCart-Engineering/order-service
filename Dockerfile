FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev && \
    addgroup -S nodeapp && \
    adduser -S nodeapp -G nodeapp

COPY --from=builder /app/dist ./dist

RUN chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 8004

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8004/health || exit 1

CMD ["node", "dist/server.js"]