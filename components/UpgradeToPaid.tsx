"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: {
        style?: Record<string, string>;
        createSubscription: (data: unknown, actions: { subscription: { create: (opts: unknown) => Promise<string> } }) => Promise<string>;
        onApprove: (data: { subscriptionID?: string }) => void;
        onError?: (err: unknown) => void;
      }) => { render: (selector: string) => void };
    };
  }
}

export default function UpgradeToPaid({ userId }: { userId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "unavailable" | "ready" | "subscribed" | "error">("loading");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const res = await fetch("/api/paypal/plan");
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        clientId?: string;
        planId?: string;
      };

      if (cancelled) return;
      if (!res.ok || !data.configured || !data.clientId || !data.planId) {
        setStatus("unavailable");
        return;
      }

      const scriptId = "paypal-sdk";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(data.clientId)}&vault=true&intent=subscription`;
        script.onload = () => renderButtons(data.planId!);
        script.onerror = () => setStatus("error");
        document.body.appendChild(script);
      } else {
        renderButtons(data.planId);
      }
    }

    function renderButtons(planId: string) {
      if (cancelled || !window.paypal || !containerRef.current) return;
      setStatus("ready");
      window.paypal
        .Buttons({
          style: { shape: "pill", color: "gold", layout: "vertical", label: "subscribe" },
          createSubscription: (_data, actions) =>
            actions.subscription.create({ plan_id: planId, custom_id: userId }),
          onApprove: () => setStatus("subscribed"),
          onError: () => setStatus("error"),
        })
        .render("#paypal-upgrade-button");
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (status === "unavailable") return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Upgrade to Paid</h2>
      {status === "subscribed" ? (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
          Subscription started! It may take a minute for your account to update.
        </p>
      ) : status === "error" ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load PayPal checkout — please try again shortly.
        </p>
      ) : (
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Remove your storage limit with a Paid subscription.
        </p>
      )}
      <div ref={containerRef} id="paypal-upgrade-button" className="mt-4 max-w-xs" />
    </div>
  );
}
