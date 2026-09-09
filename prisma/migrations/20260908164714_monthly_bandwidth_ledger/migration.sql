-- CreateTable
CREATE TABLE "BandwidthUsage" (
    "id" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "bytesServed" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BandwidthUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BandwidthUsage_periodKey_key" ON "BandwidthUsage"("periodKey");
