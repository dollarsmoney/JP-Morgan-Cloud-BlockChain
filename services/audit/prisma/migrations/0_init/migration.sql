-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateTable
CREATE TABLE "audit"."audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "service" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "payload" JSONB,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit"."audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_service_idx" ON "audit"."audit_logs"("service");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit"."audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit"."audit_logs"("created_at");

