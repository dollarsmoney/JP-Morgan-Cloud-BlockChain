-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "wallets";

-- CreateEnum
CREATE TYPE "wallets"."WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateTable
CREATE TABLE "wallets"."wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Primary Wallet',
    "balance" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BFC',
    "status" "wallets"."WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_key" ON "wallets"."wallets"("address");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"."wallets"("user_id");

-- CreateIndex
CREATE INDEX "wallets_address_idx" ON "wallets"."wallets"("address");

