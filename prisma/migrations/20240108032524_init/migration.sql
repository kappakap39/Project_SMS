/*
  Warnings:

  - The `OtpExpired` column on the `UserManagement` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "UserManagement" DROP COLUMN "OtpExpired",
ADD COLUMN     "OtpExpired" TIMESTAMP;
