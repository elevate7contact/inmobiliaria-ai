-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('COMPANY_REGISTRATION', 'COMPANY_PROOF', 'PERSONAL_ID', 'PROFESSIONAL_LICENSE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "RealtorProfile" ADD COLUMN "verifiedAt" TIMESTAMP(3),
                             ADD COLUMN "rejectionReason" TEXT;

-- CreateIndex
CREATE INDEX "RealtorProfile_verificationStatus_idx" ON "RealtorProfile"("verificationStatus");

-- CreateTable
CREATE TABLE "RealtorDocument" (
    "id" TEXT NOT NULL,
    "realtorId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,

    CONSTRAINT "RealtorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RealtorDocument_realtorId_type_key" ON "RealtorDocument"("realtorId", "type");

-- CreateIndex
CREATE INDEX "RealtorDocument_realtorId_idx" ON "RealtorDocument"("realtorId");

-- AddForeignKey
ALTER TABLE "RealtorDocument" ADD CONSTRAINT "RealtorDocument_realtorId_fkey" FOREIGN KEY ("realtorId") REFERENCES "RealtorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
