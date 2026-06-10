-- Replace the free-text status/hours with a structured schedule + same-day
-- override, so the open/closed status can be computed automatically.
ALTER TABLE "StandSettings"
    ADD COLUMN "seasonActive"   BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "openMin"        INTEGER NOT NULL DEFAULT 420,
    ADD COLUMN "closeMin"       INTEGER NOT NULL DEFAULT 720,
    ADD COLUMN "finishByMin"    INTEGER NOT NULL DEFAULT 750,
    ADD COLUMN "openDays"       TEXT    NOT NULL DEFAULT '1,2,3,4,5,6',
    ADD COLUMN "overrideStatus" TEXT    NOT NULL DEFAULT '',
    ADD COLUMN "overrideDate"   TEXT    NOT NULL DEFAULT '',
    DROP COLUMN "openStatus",
    DROP COLUMN "hoursWindow",
    DROP COLUMN "hoursDays",
    DROP COLUMN "hoursFinishBy";
