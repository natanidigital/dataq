-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "paypalClientId" TEXT,
ADD COLUMN     "paypalClientSecret" TEXT,
ADD COLUMN     "paypalMode" TEXT,
ADD COLUMN     "paypalPlanId" TEXT,
ADD COLUMN     "paypalWebhookId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "paypalSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_paypalSubscriptionId_key" ON "User"("paypalSubscriptionId");

