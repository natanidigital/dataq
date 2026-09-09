import { redirect } from "next/navigation";

import { auth } from "@/auth";
import Header from "@/components/Header";
import Dashboard from "@/components/Dashboard";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { TOTAL_BANDWIDTH_BYTES } from "@/lib/upload-config";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Membership tier isn't in the JWT (it can change without the user
  // re-logging in), so it's fetched fresh here rather than trusting a
  // possibly-stale session claim.
  const [settings, user] = await Promise.all([
    getSiteSettings(),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { membershipTier: true } }),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <Header
        username={session.user.name ?? ""}
        role={session.user.role}
        siteName={settings.siteName}
        logoUrl={settings.logoUrl ?? "/logo.png"}
        showLogoText={settings.showLogoText}
      />
      <Dashboard
        isAdmin={session.user.role === "ADMIN"}
        totalBandwidthBytes={TOTAL_BANDWIDTH_BYTES}
        userId={session.user.id}
        showUpgrade={user?.membershipTier === "FREE"}
      />
    </div>
  );
}
