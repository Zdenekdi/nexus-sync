-- CreateTable: TeamMessage
CREATE TABLE IF NOT EXISTS "TeamMessage" (
    "id"        TEXT NOT NULL,
    "agencyId"  TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "room"      TEXT NOT NULL DEFAULT 'general',
    "text"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt"  TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TeamMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TeamMessage_agencyId_room_createdAt_idx" ON "TeamMessage"("agencyId", "room", "createdAt");
CREATE INDEX IF NOT EXISTS "TeamMessage_authorId_idx" ON "TeamMessage"("authorId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamMessage_agencyId_fkey') THEN
        ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_agencyId_fkey"
            FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TeamMessage_authorId_fkey') THEN
        ALTER TABLE "TeamMessage" ADD CONSTRAINT "TeamMessage_authorId_fkey"
            FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
