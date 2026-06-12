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

ALTER TABLE "TeamMessage" ADD CONSTRAINT IF NOT EXISTS "TeamMessage_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMessage" ADD CONSTRAINT IF NOT EXISTS "TeamMessage_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
