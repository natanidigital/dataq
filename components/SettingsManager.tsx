"use client";

import { useCallback, useEffect, useState } from "react";

import type { SiteSettingsDto } from "@/lib/site-settings-dto";
import BrandingSettings from "@/components/BrandingSettings";
import SeoSettings from "@/components/SeoSettings";
import AccessSettings from "@/components/AccessSettings";
import MembershipSettings from "@/components/MembershipSettings";
import PayPalSettings from "@/components/PayPalSettings";

export default function SettingsManager() {
  const [settings, setSettings] = useState<SiteSettingsDto | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = (await res.json()) as { settings: SiteSettingsDto };
      setSettings(data.settings);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function patch(data: Partial<SiteSettingsDto>) {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const body = (await res.json()) as { settings: SiteSettingsDto };
      setSettings(body.settings);
    }
    return res.ok;
  }

  if (!settings) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <p className="text-sm text-neutral-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 px-4 py-6 sm:px-6">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Settings</h1>

      <BrandingSettings settings={settings} onChanged={refresh} onPatch={patch} />
      <SeoSettings settings={settings} onPatch={patch} />
      <AccessSettings settings={settings} onPatch={patch} />
      <MembershipSettings settings={settings} onPatch={patch} />
      <PayPalSettings settings={settings} onPatch={patch} />
    </main>
  );
}
