-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('IELTS', 'CEFR', 'OLYMPIAD', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "title" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "issuedOn" TIMESTAMP(3) NOT NULL,
    "showPublic" BOOLEAN NOT NULL DEFAULT false,
    "fileStored" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Achievement_studentId_idx" ON "Achievement"("studentId");

-- CreateIndex
CREATE INDEX "Achievement_status_showPublic_idx" ON "Achievement"("status", "showPublic");

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
