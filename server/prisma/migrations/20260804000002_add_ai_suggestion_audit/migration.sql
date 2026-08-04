-- Záznam o tom, co se stalo s návrhem od AI.
--
-- Neukládá text návrhu — je to koncept zprávy klientovi a držet ho i tady by
-- znamenalo obsah komunikace na dvou místech. U odeslaných návrhů vede odkaz
-- na Message, kde text je. Stejná úvaha jako u QaReview.
--
-- ON DELETE SET NULL u obou cizích klíčů: zanikne-li účet operátorky nebo se
-- smaže zpráva, statistika má zůstat spočitatelná. Je to opak QaReview, kde
-- hodnocení nemá přežít konverzaci — tady jde o agregát, ne o obsah.
--
-- Psáno idempotentně kvůli tomu, že se produkční schéma v minulosti rozešlo
-- s migracemi.

CREATE TABLE IF NOT EXISTS "AiSuggestion" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "profileId" TEXT,
    "chatId" TEXT,
    "operatorId" TEXT,
    "messageId" TEXT,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'PENDING',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AiSuggestion_agencyId_createdAt_idx" ON "AiSuggestion"("agencyId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiSuggestion_operatorId_idx"        ON "AiSuggestion"("operatorId");
CREATE INDEX IF NOT EXISTS "AiSuggestion_outcome_idx"           ON "AiSuggestion"("outcome");

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiSuggestion_operatorId_fkey') THEN
        ALTER TABLE "AiSuggestion"
            ADD CONSTRAINT "AiSuggestion_operatorId_fkey"
            FOREIGN KEY ("operatorId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiSuggestion_messageId_fkey') THEN
        ALTER TABLE "AiSuggestion"
            ADD CONSTRAINT "AiSuggestion_messageId_fkey"
            FOREIGN KEY ("messageId") REFERENCES "Message"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
