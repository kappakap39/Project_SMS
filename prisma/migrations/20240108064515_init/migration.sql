/*
  Warnings:

  - The primary key for the `SMSManagement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `SMSID` on the `SMSManagement` table. All the data in the column will be lost.
  - You are about to drop the column `SMSID` on the `SMSMessage` table. All the data in the column will be lost.
  - The required column `SMS_ID` was added to the `SMSManagement` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `SMS_ID` to the `SMSMessage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SMSMessage" DROP CONSTRAINT "SMSMessage_SMSID_fkey";

-- AlterTable
ALTER TABLE "SMSManagement" DROP CONSTRAINT "SMSManagement_pkey",
DROP COLUMN "SMSID",
ADD COLUMN     "SMS_ID" UUID NOT NULL,
ADD CONSTRAINT "SMSManagement_pkey" PRIMARY KEY ("SMS_ID");

-- AlterTable
ALTER TABLE "SMSMessage" DROP COLUMN "SMSID",
ADD COLUMN     "SMS_ID" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_SMS_ID_fkey" FOREIGN KEY ("SMS_ID") REFERENCES "SMSManagement"("SMS_ID") ON DELETE RESTRICT ON UPDATE CASCADE;
