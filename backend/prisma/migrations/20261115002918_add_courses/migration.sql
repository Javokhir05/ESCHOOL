-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'SCHOOL');

-- CreateEnum
CREATE TYPE "CourseFormat" AS ENUM ('ONLINE', 'OFFLINE', 'BOTH');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "level" "CourseLevel" NOT NULL,
    "format" "CourseFormat" NOT NULL,
    "status" "CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "titleUz" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "summaryUz" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL,
    "durationUz" TEXT NOT NULL,
    "durationEn" TEXT NOT NULL,
    "scheduleUz" TEXT NOT NULL,
    "scheduleEn" TEXT NOT NULL,
    "outcomes" JSONB NOT NULL,
    "curriculum" JSONB NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
