# FlowCal single-image build: compile the SPA, then run the Express API which
# also serves the built SPA. Pairs with docker-compose.yml (app + postgres).

# ---- Stage 1: build the React SPA against the self-hosted API backend ----
FROM node:20-alpine AS web
WORKDIR /web

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY src ./src
COPY public ./public

# Bake in the backend selection at build time (Vite env is compile-time).
# Empty VITE_API_URL => same-origin, since this server serves the SPA.
RUN printf 'VITE_BACKEND=api\nVITE_API_URL=\n' > .env.production
RUN npm run build   # outputs /web/dist

# ---- Stage 2: API server runtime, serving the built SPA ----
FROM node:20-alpine AS app
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ ./
COPY --from=web /web/dist ./public

ENV NODE_ENV=production
ENV PORT=3001
ENV STATIC_DIR=/app/public

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Apply pending migrations, then start the server.
CMD ["sh", "-c", "node migrate.js && node index.js"]
