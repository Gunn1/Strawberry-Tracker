-- AlterTable: configurable U-pick hours shown across the site
ALTER TABLE "StandSettings"
    ADD COLUMN "hoursWindow" TEXT NOT NULL DEFAULT '7 a.m. – noon',
    ADD COLUMN "hoursDays" TEXT NOT NULL DEFAULT 'Mon – Sat · closed Sundays',
    ADD COLUMN "hoursFinishBy" TEXT NOT NULL DEFAULT '12:30 p.m.';
