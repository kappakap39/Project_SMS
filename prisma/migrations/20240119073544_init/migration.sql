-- CreateTable
CREATE TABLE "UserManagement" (
    "UserID" UUID NOT NULL,
    "Username" VARCHAR(255) NOT NULL,
    "Password" VARCHAR(255) NOT NULL,
    "Userlevel" VARCHAR(255),
    "OTP" VARCHAR(6),
    "OtpExpired" TIMESTAMP,
    "Effectivedate" DATE NOT NULL,
    "Expireddate" DATE NOT NULL,
    "Question" VARCHAR(255),
    "Answer" VARCHAR(255),
    "Statused" BOOLEAN NOT NULL DEFAULT true,
    "Title" VARCHAR(55) NOT NULL,
    "Firstname" VARCHAR(255) NOT NULL,
    "Lastname" VARCHAR(255) NOT NULL,
    "Abbreviatename" VARCHAR(255) NOT NULL,
    "Email" VARCHAR(255) NOT NULL,
    "Tel" VARCHAR(10) NOT NULL,
    "CitiZenID" VARCHAR(13) NOT NULL,
    "Picture" VARCHAR(255),
    "EmpNo" VARCHAR(255),
    "DeptCode" VARCHAR(255),
    "CompanyCode" VARCHAR(255),
    "OperationCode" VARCHAR(255),
    "SubOperationCode" VARCHAR(255),
    "CentralRefNo" VARCHAR(255),
    "BusinessType" VARCHAR(255),
    "DocIssueUnit" VARCHAR(255),
    "LockLocation" VARCHAR(255),
    "DeptFlag" VARCHAR(255),
    "GrpSubOperation" VARCHAR(255),
    "GrpOperationCode" VARCHAR(255),
    "DefaultLanguage" VARCHAR(255),
    "FontFamily" VARCHAR(255),
    "FontSize" DOUBLE PRECISION,
    "DateFormat" DATE,
    "TimeZone" DATE,
    "AmountFormat" INTEGER,
    "Remove" BOOLEAN NOT NULL DEFAULT false,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserManagement_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "SMSManagement" (
    "SMS_ID" UUID NOT NULL,
    "UserID" UUID NOT NULL,
    "Sender" TEXT,
    "Tel" TEXT,
    "Result" TEXT,
    "Contact" TEXT,
    "ScheduleDate" TIMESTAMP(3),
    "Option" TEXT,
    "Description" TEXT DEFAULT '${SmsManagement.Result}',
    "UserEmail" TEXT,
    "PassEmail" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSManagement_pkey" PRIMARY KEY ("SMS_ID")
);

-- CreateTable
CREATE TABLE "SMSMessage" (
    "MessageID" UUID NOT NULL,
    "SMS_ID" UUID NOT NULL,
    "Message" VARCHAR(255),
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SMSMessage_pkey" PRIMARY KEY ("MessageID")
);

-- CreateTable
CREATE TABLE "TokenUser" (
    "TokenID" UUID NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "Expiration" TIMESTAMP(3) NOT NULL,
    "UserID" UUID NOT NULL,
    "TokenValue" TEXT NOT NULL,

    CONSTRAINT "TokenUser_pkey" PRIMARY KEY ("TokenID")
);

-- CreateTable
CREATE TABLE "Log_History" (
    "LoggetID" UUID NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "UserID" UUID NOT NULL,
    "TypeLogger" TEXT NOT NULL,

    CONSTRAINT "Log_History_pkey" PRIMARY KEY ("LoggetID")
);

-- CreateTable
CREATE TABLE "FileImg" (
    "ImgID" UUID NOT NULL,
    "UserID" UUID NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "FileName" TEXT NOT NULL,
    "OriginalName" TEXT NOT NULL,
    "FilePath" TEXT NOT NULL,
    "FileKey" TEXT NOT NULL,
    "Mimetype" TEXT NOT NULL,
    "FileSize" TEXT NOT NULL,

    CONSTRAINT "FileImg_pkey" PRIMARY KEY ("ImgID")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserManagement_Email_key" ON "UserManagement"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "FileImg_FileName_key" ON "FileImg"("FileName");

-- AddForeignKey
ALTER TABLE "SMSManagement" ADD CONSTRAINT "SMSManagement_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "UserManagement"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SMSMessage" ADD CONSTRAINT "SMSMessage_SMS_ID_fkey" FOREIGN KEY ("SMS_ID") REFERENCES "SMSManagement"("SMS_ID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenUser" ADD CONSTRAINT "TokenUser_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "UserManagement"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log_History" ADD CONSTRAINT "Log_History_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "UserManagement"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileImg" ADD CONSTRAINT "FileImg_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "UserManagement"("UserID") ON DELETE RESTRICT ON UPDATE CASCADE;
