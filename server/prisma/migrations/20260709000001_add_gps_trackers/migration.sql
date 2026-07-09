-- External GPS tracker bindings and location history.
CREATE TABLE "GpsTracker" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "profileId" TEXT,
    "imei" TEXT NOT NULL,
    "label" TEXT,
    "secretHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3),
    "lastLat" DOUBLE PRECISION,
    "lastLng" DOUBLE PRECISION,
    "lastAccuracy" DOUBLE PRECISION,
    "lastBattery" INTEGER,
    "lastSpeedKph" DOUBLE PRECISION,
    "lastHeading" DOUBLE PRECISION,
    "lastCapturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GpsTracker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GpsTrackerLocation" (
    "id" TEXT NOT NULL,
    "trackerId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "profileId" TEXT,
    "safetySessionId" TEXT,
    "sosAlertId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speedKph" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "battery" INTEGER,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'tracker',
    "raw" TEXT,

    CONSTRAINT "GpsTrackerLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GpsTracker_imei_key" ON "GpsTracker"("imei");
CREATE INDEX "GpsTracker_agencyId_idx" ON "GpsTracker"("agencyId");
CREATE INDEX "GpsTracker_profileId_idx" ON "GpsTracker"("profileId");
CREATE INDEX "GpsTracker_active_idx" ON "GpsTracker"("active");

CREATE INDEX "GpsTrackerLocation_trackerId_idx" ON "GpsTrackerLocation"("trackerId");
CREATE INDEX "GpsTrackerLocation_agencyId_idx" ON "GpsTrackerLocation"("agencyId");
CREATE INDEX "GpsTrackerLocation_profileId_idx" ON "GpsTrackerLocation"("profileId");
CREATE INDEX "GpsTrackerLocation_safetySessionId_idx" ON "GpsTrackerLocation"("safetySessionId");
CREATE INDEX "GpsTrackerLocation_sosAlertId_idx" ON "GpsTrackerLocation"("sosAlertId");
CREATE INDEX "GpsTrackerLocation_capturedAt_idx" ON "GpsTrackerLocation"("capturedAt");

ALTER TABLE "GpsTracker" ADD CONSTRAINT "GpsTracker_agencyId_fkey"
    FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GpsTracker" ADD CONSTRAINT "GpsTracker_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GpsTrackerLocation" ADD CONSTRAINT "GpsTrackerLocation_trackerId_fkey"
    FOREIGN KEY ("trackerId") REFERENCES "GpsTracker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GpsTrackerLocation" ADD CONSTRAINT "GpsTrackerLocation_safetySessionId_fkey"
    FOREIGN KEY ("safetySessionId") REFERENCES "SafetySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GpsTrackerLocation" ADD CONSTRAINT "GpsTrackerLocation_sosAlertId_fkey"
    FOREIGN KEY ("sosAlertId") REFERENCES "SOSAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;
