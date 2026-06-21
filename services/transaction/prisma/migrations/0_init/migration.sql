-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "transactions";

-- CreateEnum
CREATE TYPE "transactions"."TxStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "transactions"."transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "fee" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "status" "transactions"."TxStatus" NOT NULL DEFAULT 'PENDING',
    "tx_hash" TEXT NOT NULL,
    "block_index" INTEGER,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_tx_hash_key" ON "transactions"."transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"."transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"."transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_tx_hash_idx" ON "transactions"."transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "transactions_from_address_idx" ON "transactions"."transactions"("from_address");

