-- AlterTable
ALTER TABLE "ChatConversation" ADD COLUMN "clientIp" TEXT;

-- CreateIndex
CREATE INDEX "ChatConversation_clientIp_createdAt_idx" ON "ChatConversation"("clientIp", "createdAt");
