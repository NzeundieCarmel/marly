# Site Marly (Next.js 16, sortie autonome)
FROM node:24-bookworm-slim AS construction
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3001 HOSTNAME=0.0.0.0
COPY --from=construction /app/.next/standalone ./
COPY --from=construction /app/.next/static ./.next/static
COPY --from=construction /app/public ./public
USER node
EXPOSE 3001
CMD ["node", "server.js"]