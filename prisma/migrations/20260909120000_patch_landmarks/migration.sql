-- Landmarks describe what borders a patch's rows, and two patches in one field
-- rarely share a boundary, so they move down a level. The field's values are
-- carried onto its patches, so nothing already entered is lost.
ALTER TABLE "Patch" ADD COLUMN "farLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Patch" ADD COLUMN "nearLabel" TEXT NOT NULL DEFAULT '';

UPDATE "Patch" p
SET "farLabel" = f."farLabel", "nearLabel" = f."nearLabel"
FROM "Field" f
WHERE f.id = p."fieldId";

-- "Field"."farLabel" and "nearLabel" are left in place here on purpose: the
-- cloudflare branch was still reading them against this same database.
-- 20260909200000_drop_field_landmarks removes them once that work merged.
