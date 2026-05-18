-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT', 'TOOL');

-- CreateTable
CREATE TABLE "UserPreferenceProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "currency" TEXT,
    "countryId" TEXT,
    "cityId" TEXT,
    "neighborhoods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minBedrooms" INTEGER,
    "minBathrooms" INTEGER,
    "minAreaM2" DOUBLE PRECISION,
    "maxAreaM2" DOUBLE PRECISION,
    "propertyTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferFloorMin" INTEGER,
    "preferFloorMax" INTEGER,
    "freeNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreferenceProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferenceProfile_userId_key" ON "UserPreferenceProfile"("userId");
CREATE INDEX "UserPreferenceProfile_userId_idx" ON "UserPreferenceProfile"("userId");

-- AddForeignKey
ALTER TABLE "UserPreferenceProfile" ADD CONSTRAINT "UserPreferenceProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatConversation_userId_idx" ON "ChatConversation"("userId");
CREATE INDEX "ChatConversation_sessionId_idx" ON "ChatConversation"("sessionId");
CREATE INDEX "ChatConversation_createdAt_idx" ON "ChatConversation"("createdAt");

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolInput" JSONB,
    "toolOutput" JSONB,
    "propertyIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");
CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
