FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN rm -rf generated && npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# COPY --from=builder /app/prisma.config.ts ./
# COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/node_modules ./node_modules
# COPY --from=builder /app/package*.json ./
# COPY --from=builder /app/tsconfig.json ./
# COPY --from=builder /app/prisma ./prisma
# COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

COPY --from=builder /app .
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
CMD ["./docker-entrypoint.sh"]
