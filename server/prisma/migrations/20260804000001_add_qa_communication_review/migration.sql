-- Kontrola komunikace: manažerka hodnotí, jak operátorka odepsala klientovi.
--
-- Tabulka vědomě NEDRŽÍ text zprávy, jen odkaz na ni. Obsah komunikace
-- s klientem zůstává na jediném místě (Message) — kdyby se kopíroval sem,
-- držel by se dvakrát a retence by se musela řešit dvakrát.
--
-- ON DELETE CASCADE u messageId je záměr: hodnocení nemá přežít konverzaci,
-- ke které se vztahuje. Smazání konverzace tím zároveň uklidí i QA vzorky.
--
-- Psáno idempotentně (IF NOT EXISTS, guard na pg_constraint) kvůli tomu, že
-- se produkční schéma v minulosti rozešlo s migracemi a tahle musí projít
-- i na databázi, kde už část objektů existuje.

CREATE TABLE IF NOT EXISTS "QaReview" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "operatorId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QaReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QaReview_agencyId_idx"   ON "QaReview"("agencyId");
CREATE INDEX IF NOT EXISTS "QaReview_operatorId_idx" ON "QaReview"("operatorId");
CREATE INDEX IF NOT EXISTS "QaReview_messageId_idx"  ON "QaReview"("messageId");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QaReview_messageId_fkey') THEN
        ALTER TABLE "QaReview"
            ADD CONSTRAINT "QaReview_messageId_fkey"
            FOREIGN KEY ("messageId") REFERENCES "Message"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- Operátorka smí zaniknout, hodnocení má zůstat dohledatelné.
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QaReview_operatorId_fkey') THEN
        ALTER TABLE "QaReview"
            ADD CONSTRAINT "QaReview_operatorId_fkey"
            FOREIGN KEY ("operatorId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QaReview_reviewerId_fkey') THEN
        ALTER TABLE "QaReview"
            ADD CONSTRAINT "QaReview_reviewerId_fkey"
            FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
