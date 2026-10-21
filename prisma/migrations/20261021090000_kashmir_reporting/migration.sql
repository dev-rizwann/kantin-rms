CREATE TABLE "reporting_boundary" (
  "kantinSlug" TEXT PRIMARY KEY,
  "firstTradingLocal" TEXT,
  "instanceId" TEXT,
  "receiptBaseline" INTEGER,
  "registeredAt" TIMESTAMP(3),
  "lastBackupAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reporting_baseline_nonnegative" CHECK ("receiptBaseline" IS NULL OR "receiptBaseline" >= 0)
);
INSERT INTO "reporting_boundary" ("kantinSlug") VALUES ('kashmir');
INSERT INTO "Kantin" ("slug", "name", "city", "fullAddress", "isLive", "defaultCurrency", "timezone", "createdAt")
VALUES ('kashmir', 'Kashmir Kantin', 'AJK', 'Kashmir / AJK', false, 'PKR', 'Asia/Karachi', CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
