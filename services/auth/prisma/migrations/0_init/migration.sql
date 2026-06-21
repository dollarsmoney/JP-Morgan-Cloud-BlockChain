-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app_auth";

-- CreateEnum
CREATE TYPE "app_auth"."Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "app_auth"."AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateTable
CREATE TABLE "app_auth"."credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "app_auth"."Role" NOT NULL DEFAULT 'USER',
    "status" "app_auth"."AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_auth"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_key" ON "app_auth"."credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_email_key" ON "app_auth"."credentials"("email");

-- CreateIndex
CREATE INDEX "credentials_email_idx" ON "app_auth"."credentials"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "app_auth"."refresh_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_jti_key" ON "app_auth"."refresh_tokens"("jti");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "app_auth"."refresh_tokens"("user_id");

-- AddForeignKey
ALTER TABLE "app_auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_auth"."credentials"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

