-- AlterTable: booking settings sit alongside the schedule they derive from.
ALTER TABLE "StandSettings" ADD COLUMN "bookingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StandSettings" ADD COLUMN "slotMinutes" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "StandSettings" ADD COLUMN "slotCapacity" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "StandSettings" ADD COLUMN "bookingDays" INTEGER NOT NULL DEFAULT 21;

-- AlterTable: a reservation is reached by its token, since there is no account.
ALTER TABLE "Reservation" ADD COLUMN "token" TEXT;
ALTER TABLE "Reservation" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Any reservation predating tokens still needs one that is unique.
UPDATE "Reservation" SET "token" = replace(gen_random_uuid()::text, '-', '') WHERE "token" IS NULL;

ALTER TABLE "Reservation" ALTER COLUMN "token" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_token_key" ON "Reservation"("token");
CREATE INDEX "Reservation_email_idx" ON "Reservation"("email");
