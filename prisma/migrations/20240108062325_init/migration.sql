-- CreateTable
CREATE TABLE "SmsManagement" (
    "SmsID" UUID NOT NULL,
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

    CONSTRAINT "SmsManagement_pkey" PRIMARY KEY ("SmsID")
);

-- CreateTable
CREATE TABLE "SmsMessage" (
    "MessageID" UUID NOT NULL,
    "SmsID" UUID NOT NULL,
    "Message" VARCHAR(255),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("MessageID")
);

-- AddForeignKey
ALTER TABLE "SmsManagement" ADD CONSTRAINT "SmsManagement_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "UserManagement"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_SmsID_fkey" FOREIGN KEY ("SmsID") REFERENCES "SmsManagement"("SmsID") ON DELETE RESTRICT ON UPDATE CASCADE;
