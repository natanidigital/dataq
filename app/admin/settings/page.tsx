import { redirect } from "next/navigation";

import { auth } from "@/auth";
import Header from "@/components/Header";
import SettingsManager from "@/components/SettingsManager";
import { getSiteSettings } from "@/lib/site-settings";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const settings = await getSiteSettings();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <Header
        username={session.user.name ?? ""}
        role={session.user.role}
        siteName={settings.siteName}
        logoUrl={settings.logoUrl ?? "/logo.png"}
        showLogoText={settings.showLogoText}
      />
      <SettingsManager />
    </div>
  );
}
