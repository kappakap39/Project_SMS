/*
  Warnings:

  - You are about to drop the column `Status` on the `UserManagement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserManagement" DROP COLUMN "Status",
ADD COLUMN     "Statused" BOOLEAN NOT NULL DEFAULT true;
