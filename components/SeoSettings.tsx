"use client";

import { useState } from "react";

import type { SiteSettingsDto } from "@/lib/site-settings-dto";

export default function SeoSettings({
  settings,
  onPatch,
}: {
  settings: SiteSettingsDto;
  onPatch: (data: Partial<SiteSettingsDto>) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(settings.seoTitle ?? "");
  const [description, setDescription] = useState(settings.seoDescription ?? "");
  const [ogImage, setOgImage] = useState(settings.seoOgImageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const ok = await onPatch({
        seoTitle: title || null,
        seoDescription: description || null,
        seoOgImageUrl: ogImage || null,
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
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">SEO</h2>
      <p className="mt-1 text-xs text-neutral-400">
        Controls the page title, meta description, and social-share preview image. Leave blank to use
        the defaults.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500">Meta title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={settings.siteName}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Meta description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Private image hosting"
            rows={2}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Social-share image URL</label>
          <input
            value={ogImage}
            onChange={(e) => setOgImage(e.target.value)}
            placeholder="https://…"
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
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
