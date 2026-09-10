-- The landmark labels moved onto Patch in 20260909120000, which copied the
-- field's values down. The columns on Field were left in place only because
-- the cloudflare branch still read them against this same database. That work
-- is merged, so nothing reads them now.
ALTER TABLE "Field" DROP COLUMN IF EXISTS "farLabel";
ALTER TABLE "Field" DROP COLUMN IF EXISTS "nearLabel";
