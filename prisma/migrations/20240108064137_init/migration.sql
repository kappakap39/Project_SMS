/*
  Warnings:

  - You are about to drop the `SmsManagement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SmsMessage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SmsManagement" DROP CONSTRAINT "SmsManagement_UserID_fkey";

-- DropForeignKey
ALTER TABLE "SmsMessage" DROP CONSTRAINT "SmsMessage_SmsID_fkey";

-- DropTable
DROP TABLE "SmsManagement";

-- DropTable
DROP TABLE "SmsMessage";

-- CreateTable
CREATE TABLE "SMSManagement" (
    "SMSID" UUID NOT NULL,
    "UserID" UUID NOT NULL,
    "Sender" TEXT,
    "Tel" TEXT,
    "Result" TEXT,
    "Contact" TEXT,
    "ScheduleDate" TIMESTAMP(3),
    "Option" TEXT,
    "Description" TEXT DEFAULT '${SmsManagement.Result}',
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSManagement_pkey" PRIMARY KEY ("SMSID")
);

-- CreateTable
CREATE TABLE "SMSMessage" (
    "MessageID" UUID NOT NULL,
    "SMSID" UUID NOT NULL,
    "Message" VARCHAR(255),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSMessage_pkey" PRIMARY KEY ("MessageID")
);

-- AddForeignKey
ALTER TABLE "SMSManagement" ADD CONSTRAINT "SMSManagement_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "UserManagement"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_SMSID_fkey" FOREIGN KEY ("SMSID") REFERENCES "SMSManagement"("SMSID") ON DELETE RESTRICT ON UPDATE CASCADE;
