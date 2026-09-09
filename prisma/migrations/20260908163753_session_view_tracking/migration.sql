-- CreateTable
CREATE TABLE "ImageView" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageView_imageId_sessionId_key" ON "ImageView"("imageId", "sessionId");

-- AddForeignKey
ALTER TABLE "ImageView" ADD CONSTRAINT "ImageView_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
