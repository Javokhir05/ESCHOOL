-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "size" INTEGER,
ADD COLUMN     "storedName" TEXT,
ALTER COLUMN "url" DROP NOT NULL;
