-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "blockchain";

-- CreateTable
CREATE TABLE "blockchain"."blocks" (
    "id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "previous_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "nonce" BIGINT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "merkle_root" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain"."chain_transactions" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "receiver" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "fee" DECIMAL(36,18) NOT NULL DEFAULT 0,
    "signature" TEXT,
    "tx_hash" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chain_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocks_index_key" ON "blockchain"."blocks"("index");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_hash_key" ON "blockchain"."blocks"("hash");

-- CreateIndex
CREATE INDEX "blocks_index_idx" ON "blockchain"."blocks"("index");

-- CreateIndex
CREATE UNIQUE INDEX "chain_transactions_tx_hash_key" ON "blockchain"."chain_transactions"("tx_hash");

-- CreateIndex
CREATE INDEX "chain_transactions_sender_idx" ON "blockchain"."chain_transactions"("sender");

-- CreateIndex
CREATE INDEX "chain_transactions_receiver_idx" ON "blockchain"."chain_transactions"("receiver");

-- CreateIndex
CREATE INDEX "chain_transactions_tx_hash_idx" ON "blockchain"."chain_transactions"("tx_hash");

-- AddForeignKey
ALTER TABLE "blockchain"."chain_transactions" ADD CONSTRAINT "chain_transactions_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "blockchain"."blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

