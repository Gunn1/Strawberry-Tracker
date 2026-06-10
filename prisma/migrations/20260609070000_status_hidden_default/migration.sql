-- The banner is an in-season tool — default it off so it doesn't clutter the
-- off-season, and clear the initial pre-season value on the singleton row.
ALTER TABLE "StandSettings" ALTER COLUMN "openStatus" SET DEFAULT 'hidden';
UPDATE "StandSettings" SET "openStatus" = 'hidden' WHERE "openStatus" = 'preseason';
