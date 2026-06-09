-- CreateTable
CREATE TABLE "StandSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "quartCents" INTEGER NOT NULL DEFAULT 500,
    "flatCents" INTEGER NOT NULL DEFAULT 3600,
    "quartsPerFlat" INTEGER NOT NULL DEFAULT 8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandSettings_pkey" PRIMARY KEY ("id")
);
