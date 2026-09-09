"use client";

import type { SiteSettingsDto } from "@/lib/site-settings-dto";

export default function AccessSettings({
  settings,
  onPatch,
}: {
  settings: SiteSettingsDto;
  onPatch: (data: Partial<SiteSettingsDto>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Access</h2>

      <label className="mt-4 flex items-start gap-3 text-sm text-neutral-700 dark:text-neutral-300">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={settings.registrationOpen}
          onChange={(e) => void onPatch({ registrationOpen: e.target.checked })}
        />
        <span>
          <span className="font-medium text-neutral-900 dark:text-neutral-50">Open public registration</span>
          <br />
          <span className="text-neutral-500 dark:text-neutral-400">
            When off (default), accounts can only be created by an admin from the Users page. When on,
            anyone can create their own account at <code>/register</code> as a Free-tier user.
          </span>
        </span>
      </label>
    </section>
  );
}
