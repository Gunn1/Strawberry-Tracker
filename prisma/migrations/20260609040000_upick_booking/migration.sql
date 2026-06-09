-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startMin" INTEGER NOT NULL,
    "endMin" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "partySize" INTEGER NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Slot_date_idx" ON "Slot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Slot_date_startMin_key" ON "Slot"("date", "startMin");

-- CreateIndex
CREATE INDEX "Reservation_slotId_idx" ON "Reservation"("slotId");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
