"use client";

import { useState } from "react";

import type { SiteSettingsDto } from "@/lib/site-settings-dto";

export default function PayPalSettings({
  settings,
  onPatch,
}: {
  settings: SiteSettingsDto;
  onPatch: (data: Partial<SiteSettingsDto>) => Promise<boolean>;
}) {
  const [mode, setMode] = useState(settings.paypalMode ?? "sandbox");
  const [clientId, setClientId] = useState(settings.paypalClientId ?? "");
  const [clientSecret, setClientSecret] = useState("");
  const [webhookId, setWebhookId] = useState(settings.paypalWebhookId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const data: Partial<SiteSettingsDto> & { paypalClientSecret?: string } = {
        paypalMode: mode,
        paypalClientId: clientId || null,
        paypalWebhookId: webhookId || null,
      };
      if (clientSecret.trim()) data.paypalClientSecret = clientSecret.trim();
      const ok = await onPatch(data);
      if (ok) {
        setClientSecret("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">PayPal</h2>
      <p className="mt-1 text-xs text-neutral-400">
        Connects this site to your own PayPal account so users can subscribe to the Paid plan above.
        Create a PayPal Developer app to get a Client ID and Secret, and a webhook (pointed at{" "}
        <code>/api/webhooks/paypal</code>) to get a Webhook ID.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            <option value="sandbox">Sandbox (testing)</option>
            <option value="live">Live</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Client ID</label>
          <input
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">
            Client Secret {settings.hasPaypalClientSecret && <span className="text-emerald-600 dark:text-emerald-400">(set)</span>}
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={settings.hasPaypalClientSecret ? "Leave blank to keep the current secret" : ""}
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500">Webhook ID</label>
          <input
            value={webhookId}
            onChange={(e) => setWebhookId(e.target.value)}
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
