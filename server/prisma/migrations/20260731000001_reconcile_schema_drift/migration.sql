-- Dorovnání migrací se schématem (schema drift reconciliation).
--
-- Historicky se změny schématu nasazovaly přes `prisma db push`, takže adresář
-- migrací zůstal pozadu: 5 tabulek a 12 sloupců vzniklo jen v databázi, nikdy
-- v migracích. DB postavená POUZE z migrací (nové prostředí, integrační testy)
-- proto neodpovídala schématu — chyběly jí mj. RefreshToken a ApiKey.
--
-- Migrace ten rozdíl dorovnává a je ZÁMĚRNĚ IDEMPOTENTNÍ (IF NOT EXISTS +
-- guardy na constrainty), aby na existující produkční DB proběhla jako no-op.
-- Vygenerováno z `prisma migrate diff` a ověřeno proti čistému PostgreSQL.

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "aiInstructions" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "integrityHash" TEXT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "clientId" TEXT,
ADD COLUMN IF NOT EXISTS "clientPhone" TEXT,
ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Chat" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- AlterTable
ALTER TABLE "ClientNote" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- AlterTable
ALTER TABLE "GpsTracker" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "commission" DOUBLE PRECISION NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS "credentials" TEXT,
ADD COLUMN IF NOT EXISTS "sampleMessages" TEXT;

-- AlterTable
ALTER TABLE "SalonKey" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "securityPin" TEXT,
ADD COLUMN IF NOT EXISTS "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SipTrunk" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 5060,
    "authMode" TEXT NOT NULL DEFAULT 'register',
    "username" TEXT,
    "password" TEXT,
    "fromUser" TEXT,
    "codecs" TEXT NOT NULL DEFAULT 'ulaw,alaw',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SipTrunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SipDid" (
    "id" TEXT NOT NULL,
    "trunkId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "profileId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SipDid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Client" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastVisit" TIMESTAMP(3),
    "tags" TEXT,
    "preferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ApiKey" (
    "id" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT 'read:stats',
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SipTrunk_agencyId_idx" ON "SipTrunk"("agencyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SipDid_profileId_idx" ON "SipDid"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SipDid_trunkId_number_key" ON "SipDid"("trunkId", "number");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_agencyId_idx" ON "Client"("agencyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Client_phone_idx" ON "Client"("phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Client_agencyId_phone_key" ON "Client"("agencyId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ApiKey_keyId_key" ON "ApiKey"("keyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiKey_agencyId_idx" ON "ApiKey"("agencyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ApiKey_keyId_idx" ON "ApiKey"("keyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_clientId_idx" ON "Booking"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_clientPhone_idx" ON "Booking"("clientPhone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_agencyId_idx" ON "Booking"("agencyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_profileId_idx" ON "Booking"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CallLog_profileId_idx" ON "CallLog"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Chat_clientId_idx" ON "Chat"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Chat_agencyId_idx" ON "Chat"("agencyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Chat_profileId_idx" ON "Chat"("profileId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ClientNote_clientId_idx" ON "ClientNote"("clientId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Profile_agencyId_idx" ON "Profile"("agencyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_agencyId_idx" ON "User"("agencyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SipTrunk_agencyId_fkey') THEN
        ALTER TABLE "SipTrunk" ADD CONSTRAINT "SipTrunk_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SipDid_trunkId_fkey') THEN
        ALTER TABLE "SipDid" ADD CONSTRAINT "SipDid_trunkId_fkey" FOREIGN KEY ("trunkId") REFERENCES "SipTrunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SipDid_profileId_fkey') THEN
        ALTER TABLE "SipDid" ADD CONSTRAINT "SipDid_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ClientNote_clientId_fkey') THEN
        ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Booking_clientId_fkey') THEN
        ALTER TABLE "Booking" ADD CONSTRAINT "Booking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Chat_clientId_fkey') THEN
        ALTER TABLE "Chat" ADD CONSTRAINT "Chat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_agencyId_fkey') THEN
        ALTER TABLE "Client" ADD CONSTRAINT "Client_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RefreshToken_userId_fkey') THEN
        ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ApiKey_agencyId_fkey') THEN
        ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
