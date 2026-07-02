# KSP Crime Intelligence Portal — Docker Configuration
# Phase 7: Multi-stage production build

FROM node:20-alpine AS base
WORKDIR /app
RUN addgroup -S ksp && adduser -S ksp -G ksp

# --- Backend build ---
FROM base AS backend-deps
COPY functions/package*.json ./functions/
RUN cd functions && npm ci --omit=dev

# --- Client build ---
FROM base AS client-build
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# --- Production image ---
FROM base AS production

# Copy backend
COPY --from=backend-deps /app/functions/node_modules ./functions/node_modules
COPY functions/ ./functions/
COPY datastore/ ./datastore/
COPY package.json ./

# Copy built client
COPY --from=client-build /app/client/dist ./client/dist

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Security: run as non-root
USER ksp

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:3001/api/health/live || exit 1

CMD ["node", "functions/server.js"]
