ALTER TABLE "Agency" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "providerStatus" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Agency_stripeCustomerId_key" ON "Agency"("stripeCustomerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_stripeCheckoutSessionId_key" ON "Subscription"("stripeCheckoutSessionId");
CREATE INDEX IF NOT EXISTS "Subscription_provider_idx" ON "Subscription"("provider");
CREATE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");
