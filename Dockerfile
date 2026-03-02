# ---- Base image (small + official) ----
FROM node:20-alpine

# ---- App directory ----
WORKDIR /app

# ---- Copy dependency files first (better build cache) ----
COPY backend/package*.json ./backend/

# Install only production deps (smaller image)
RUN cd backend && npm ci --omit=dev

# ---- Copy application code ----
COPY backend ./backend
COPY frontend ./frontend

# Ensure uploads folder exists + permissions
RUN mkdir -p /app/backend/uploads && chown -R node:node /app

# Run as non-root (least privilege)
USER node

EXPOSE 3000

# Healthcheck (your app already has /health)
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "backend/server.js"]