"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import type { SiteSettingsDto } from "@/lib/site-settings-dto";

type SavedKey = "logo" | "icon" | "pwaTitle" | "siteName" | "showLogoText" | null;

export default function BrandingSettings({
  settings,
  onChanged,
  onPatch,
}: {
  settings: SiteSettingsDto;
  onChanged: () => void;
  onPatch: (data: Partial<SiteSettingsDto>) => Promise<boolean>;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"logo" | "icon" | null>(null);
  const [siteName, setSiteName] = useState(settings.siteName);
  const [pwaTitle, setPwaTitle] = useState(settings.pwaTitle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedKey>(null);

  function flashSaved(key: SavedKey) {
    setSaved(key);
    setTimeout(() => setSaved((current) => (current === key ? null : current)), 2000);
  }

  async function upload(kind: "logo" | "icon", file: File) {
    setError(null);
    setUploading(kind);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      const res = await fetch("/api/admin/settings/branding", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `Failed to upload ${kind}.`);
        return;
      }
      onChanged();
      flashSaved(kind);
    } catch {
      setError(`Failed to upload ${kind} — check your connection and try again.`);
    } finally {
      setUploading(null);
    }
  }

  async function save(key: SavedKey, data: Partial<SiteSettingsDto>) {
    setError(null);
    const ok = await onPatch(data);
    if (ok) {
      flashSaved(key);
    } else {
      setError("Failed to save — please try again.");
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Branding</h2>

      <div className="mt-4 flex items-center gap-4">
        <Image
          src={settings.logoUrl ?? "/logo.png"}
          alt="Logo"
          width={56}
          height={56}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800"
          unoptimized
        />
        <div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload("logo", file);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading === "logo"}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {uploading === "logo" ? "Uploading…" : "Upload logo"}
            </button>
            {saved === "logo" && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved!</span>}
          </div>
          <p className="mt-1 text-xs text-neutral-400">Shown in the header, login, and landing page.</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <Image
          src={settings.iconUrl ?? "/icon-192.png"}
          alt="Icon"
          width={56}
          height={56}
          className="rounded-lg border border-neutral-200 dark:border-neutral-800"
          unoptimized
        />
        <div>
          <input
            ref={iconInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload("icon", file);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => iconInputRef.current?.click()}
              disabled={uploading === "icon"}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {uploading === "icon" ? "Uploading…" : "Upload PWA icon"}
            </button>
            {saved === "icon" && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved!</span>}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            Favicon and home-screen icon when installed as an app. Square image recommended.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={pwaTitle}
          onChange={(e) => setPwaTitle(e.target.value)}
          placeholder={`PWA app name (defaults to "${settings.siteName}")`}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        />
        <button
          onClick={() => void save("pwaTitle", { pwaTitle: pwaTitle || null })}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          Save
        </button>
        {saved === "pwaTitle" && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved!</span>}
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        The name shown under the icon when installed on a phone home screen — can differ from the site
        name shown in the app itself.
      </p>

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800 sm:flex-row sm:items-center">
        <input
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="Site name"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={settings.showLogoText}
            onChange={(e) => void save("showLogoText", { showLogoText: e.target.checked })}
          />
          Show site name next to logo
        </label>
        <button
          onClick={() => void save("siteName", { siteName })}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Save
        </button>
        {(saved === "siteName" || saved === "showLogoText") && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved!</span>
        )}
      </div>
    </section>
  );
}
