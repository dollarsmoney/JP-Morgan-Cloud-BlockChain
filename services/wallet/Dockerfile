# syntax=docker/dockerfile:1
# Multi-stage build for the wallet service. Build context = repository root.
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# ---- build ----
FROM base AS build
ENV WALLET_DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=wallet"
ENV WALLET_DIRECT_URL="postgresql://user:pass@localhost:5432/db?schema=wallet"
# Copy the full workspace manifest graph so npm can resolve the lockfile.
COPY package.json package-lock.json .npmrc tsconfig.base.json ./
COPY packages/common/package.json packages/common/
COPY services/auth/package.json services/auth/
COPY services/user/package.json services/user/
COPY services/wallet/package.json services/wallet/
COPY services/blockchain/package.json services/blockchain/
COPY services/transaction/package.json services/transaction/
COPY services/notification/package.json services/notification/
COPY services/audit/package.json services/audit/
COPY services/api-gateway/package.json services/api-gateway/
COPY frontend/package.json frontend/
# Install only this service + the shared package (and the workspace root).
RUN npm ci --include-workspace-root -w @blockchain/common -w @blockchain/wallet-service
COPY packages/common ./packages/common
COPY services/wallet ./services/wallet
COPY proto ./proto
RUN npm run build -w @blockchain/common  && npx prisma generate --schema services/wallet/prisma/schema.prisma  && npm run build -w @blockchain/wallet-service

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
ENV PROTO_DIR=/app/proto
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/common/dist ./packages/common/dist
COPY --from=build /app/packages/common/package.json ./packages/common/package.json
COPY --from=build /app/services/wallet/dist ./services/wallet/dist
COPY --from=build /app/services/wallet/package.json ./services/wallet/package.json
COPY --from=build /app/services/wallet/src/generated ./services/wallet/dist/generated
COPY --from=build /app/proto ./proto
USER node
CMD ["node", "services/wallet/dist/index.js"]
