-- CreateTable: SalonKey
CREATE TABLE IF NOT EXISTS "SalonKey" (
    "id"          TEXT NOT NULL,
    "agencyId"    TEXT NOT NULL,
    "label"       TEXT NOT NULL DEFAULT 'Klíče od salonu',
    "holderId"    TEXT,
    "takenAt"     TIMESTAMP(3),
    "note"        TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SalonKeyLog
CREATE TABLE IF NOT EXISTS "SalonKeyLog" (
    "id"        TEXT NOT NULL,
    "keyId"     TEXT NOT NULL,
    "action"    TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "note"      TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonKeyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalonKey_agencyId_idx" ON "SalonKey"("agencyId");
CREATE INDEX IF NOT EXISTS "SalonKey_holderId_idx" ON "SalonKey"("holderId");
CREATE INDEX IF NOT EXISTS "SalonKeyLog_keyId_idx" ON "SalonKeyLog"("keyId");
CREATE INDEX IF NOT EXISTS "SalonKeyLog_userId_idx" ON "SalonKeyLog"("userId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalonKey_agencyId_fkey') THEN
        ALTER TABLE "SalonKey" ADD CONSTRAINT "SalonKey_agencyId_fkey"
            FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalonKey_holderId_fkey') THEN
        ALTER TABLE "SalonKey" ADD CONSTRAINT "SalonKey_holderId_fkey"
            FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalonKeyLog_keyId_fkey') THEN
        ALTER TABLE "SalonKeyLog" ADD CONSTRAINT "SalonKeyLog_keyId_fkey"
            FOREIGN KEY ("keyId") REFERENCES "SalonKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SalonKeyLog_userId_fkey') THEN
        ALTER TABLE "SalonKeyLog" ADD CONSTRAINT "SalonKeyLog_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
