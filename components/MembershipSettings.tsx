"use client";

import { useState } from "react";

import type { SiteSettingsDto } from "@/lib/site-settings-dto";

export default function MembershipSettings({
  settings,
  onPatch,
}: {
  settings: SiteSettingsDto;
  onPatch: (data: Partial<SiteSettingsDto>) => Promise<boolean>;
}) {
  const [freeMaxImages, setFreeMaxImages] = useState(String(settings.freeMaxImages));
  const [freeMaxStorageMB, setFreeMaxStorageMB] = useState(String(settings.freeMaxStorageMB));
  const [paidPriceUsd, setPaidPriceUsd] = useState(String(settings.paidPriceUsd));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const ok = await onPatch({
        freeMaxImages: Number(freeMaxImages) || 0,
        freeMaxStorageMB: Number(freeMaxStorageMB) || 0,
        paidPriceUsd: Number(paidPriceUsd) || 0,
      });
      if (ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Membership</h2>
      <p className="mt-1 text-xs text-neutral-400">
        Free-tier limits apply to any user marked Free on the Users page — Paid and Admin accounts are
        unlimited. Assign a user&apos;s tier from{" "}
        <a href="/admin/users" className="underline">
          Users
        </a>
        .
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500">Free: max images</label>
          <input
            type="number"
            min={0}
            value={freeMaxImages}
            onChange={(e) => setFreeMaxImages(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Free: max storage (MB)</label>
          <input
            type="number"
            min={0}
            value={freeMaxStorageMB}
            onChange={(e) => setFreeMaxStorageMB(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Paid price (USD/mo)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={paidPriceUsd}
            onChange={(e) => setPaidPriceUsd(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        Users can subscribe via PayPal once you&apos;ve connected an account below — or you can always
        mark someone Paid manually from the Users page.
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved!</span>}
      </div>
    </section>
  );
}
