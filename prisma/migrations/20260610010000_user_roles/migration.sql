-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- AlterTable
ALTER TABLE "User"
    ADD COLUMN "role" "Role" NOT NULL DEFAULT 'STAFF',
    ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;

-- Keep any existing users able to sign in (new sign-ups default to inactive).
UPDATE "User" SET "active" = true;
