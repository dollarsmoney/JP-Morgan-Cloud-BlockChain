# syntax=docker/dockerfile:1
# Multi-stage build for the API Gateway. Build context = repository root.
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ---- build ----
FROM base AS build
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
RUN npm ci --include-workspace-root -w @blockchain/common -w @blockchain/api-gateway
COPY packages/common ./packages/common
COPY services/api-gateway ./services/api-gateway
COPY proto ./proto
RUN npm run build -w @blockchain/common && npm run build -w @blockchain/api-gateway

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
ENV PROTO_DIR=/app/proto
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/common/dist ./packages/common/dist
COPY --from=build /app/packages/common/package.json ./packages/common/package.json
COPY --from=build /app/services/api-gateway/dist ./services/api-gateway/dist
COPY --from=build /app/services/api-gateway/package.json ./services/api-gateway/package.json
COPY --from=build /app/proto ./proto
EXPOSE 4000
USER node
CMD ["node", "services/api-gateway/dist/index.js"]
