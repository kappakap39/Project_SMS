-- CreateTable
CREATE TABLE "UserManagement" (
    "IDUserOrAdmin" UUID NOT NULL,
    "UserName" TEXT NOT NULL,
    "Password" TEXT NOT NULL,
    "Pincode" TEXT,
    "UserLevel" TEXT NOT NULL,
    "EffectiveDate" TIMESTAMP(3),
    "ExpiredDate" TIMESTAMP(3),
    "InvalidPasswordCount" INTEGER,
    "SecretQuestion" TEXT,
    "Answer" TEXT,
    "Status" BOOLEAN NOT NULL DEFAULT true,
    "Title" TEXT,
    "FirstName" TEXT,
    "LastName" TEXT,
    "AbbreviateName" TEXT,
    "Email" TEXT,
    "Telephone" VARCHAR(10),
    "CitiZenID" TEXT,
    "Picture" TEXT,
    "EmpNo" TEXT,
    "DeptCode" TEXT,
    "CompanyCode" TEXT,
    "OperationCode" TEXT,
    "SubOperationCode" TEXT,
    "CentralRefNo" TEXT,
    "BusinessType" TEXT,
    "DocIssueUnit" TEXT,
    "LockLocation" TEXT,
    "DeptFlag" TEXT,
    "GrpSubOperation" TEXT,
    "GrpOperationCode" TEXT,
    "DefaultLanguage" TEXT,
    "FontFamily" TEXT,
    "FontSize" DOUBLE PRECISION,
    "DateFormat" TIMESTAMP(3),
    "TimeZone" TIMESTAMP(3),
    "AmountFormat" INTEGER,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserManagement_pkey" PRIMARY KEY ("IDUserOrAdmin")
);

-- CreateTable
CREATE TABLE "SmsManagement" (
    "SmsID" UUID NOT NULL,
    "IDUserOrAdmin" UUID NOT NULL,
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

-- CreateTable
CREATE TABLE "TokenUser" (
    "TokenID" UUID NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "Expiration" TIMESTAMP(3) NOT NULL,
    "IDUserOrAdmin" UUID NOT NULL,
    "TokenValue" TEXT NOT NULL,

    CONSTRAINT "TokenUser_pkey" PRIMARY KEY ("TokenID")
);

-- CreateTable
CREATE TABLE "LoggetsUser" (
    "LoggetID" UUID NOT NULL,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP(3) NOT NULL,
    "IDUserOrAdmin" UUID NOT NULL,
    "TypeLogger" TEXT NOT NULL,

    CONSTRAINT "LoggetsUser_pkey" PRIMARY KEY ("LoggetID")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserManagement_Email_key" ON "UserManagement"("Email");

-- AddForeignKey
ALTER TABLE "SmsManagement" ADD CONSTRAINT "SmsManagement_IDUserOrAdmin_fkey" FOREIGN KEY ("IDUserOrAdmin") REFERENCES "UserManagement"("IDUserOrAdmin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_SmsID_fkey" FOREIGN KEY ("SmsID") REFERENCES "SmsManagement"("SmsID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenUser" ADD CONSTRAINT "TokenUser_IDUserOrAdmin_fkey" FOREIGN KEY ("IDUserOrAdmin") REFERENCES "UserManagement"("IDUserOrAdmin") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoggetsUser" ADD CONSTRAINT "LoggetsUser_IDUserOrAdmin_fkey" FOREIGN KEY ("IDUserOrAdmin") REFERENCES "UserManagement"("IDUserOrAdmin") ON DELETE RESTRICT ON UPDATE CASCADE;
