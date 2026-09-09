-- CreateEnum
CREATE TYPE "MembershipTier" AS ENUM ('FREE', 'PAID');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "membershipTier" "MembershipTier" NOT NULL DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "siteName" TEXT NOT NULL DEFAULT 'dataq',
    "logoUrl" TEXT,
    "showLogoText" BOOLEAN NOT NULL DEFAULT true,
    "iconUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoOgImageUrl" TEXT,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "freeMaxImages" INTEGER NOT NULL DEFAULT 50,
    "freeMaxStorageMB" INTEGER NOT NULL DEFAULT 500,
    "paidPriceUsd" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
