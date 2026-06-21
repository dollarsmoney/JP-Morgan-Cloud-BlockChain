# syntax=docker/dockerfile:1
# Multi-stage build for the user service. Build context = repository root.
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# ---- build ----
FROM base AS build
ENV USER_DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=user"
ENV USER_DIRECT_URL="postgresql://user:pass@localhost:5432/db?schema=user"
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
RUN npm ci --include-workspace-root -w @blockchain/common -w @blockchain/user-service
COPY packages/common ./packages/common
COPY services/user ./services/user
COPY proto ./proto
RUN npm run build -w @blockchain/common  && npx prisma generate --schema services/user/prisma/schema.prisma  && npm run build -w @blockchain/user-service

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
ENV PROTO_DIR=/app/proto
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/common/dist ./packages/common/dist
COPY --from=build /app/packages/common/package.json ./packages/common/package.json
COPY --from=build /app/services/user/dist ./services/user/dist
COPY --from=build /app/services/user/package.json ./services/user/package.json
COPY --from=build /app/services/user/src/generated ./services/user/dist/generated
COPY --from=build /app/proto ./proto
USER node
CMD ["node", "services/user/dist/index.js"]
