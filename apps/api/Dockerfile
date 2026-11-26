# API Marly (NestJS + Prisma 6)
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 4001
# Applique les migrations, puis demarre l'API (dist/main.js ou dist/src/main.js)
CMD ["sh", "-c", "npx prisma migrate deploy && if [ -f dist/main.js ]; then exec node dist/main.js; else exec node dist/src/main.js; fi"]