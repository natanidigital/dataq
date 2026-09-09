import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { auth } from "@/auth";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

const FEATURES = [
  {
    title: "Direct links",
    description: "Every upload gets a short, unguessable direct link — ready to paste anywhere.",
  },
  {
    title: "Public or private",
    description: "Toggle any image between public (anyone with the link) and private (only you).",
  },
  {
    title: "Copy-paste HTML",
    description: "One click copies a ready-to-use <img> tag for embedding straight into a page.",
  },
  {
    title: "Invite-only",
    description: "No public sign-up — accounts are created by an admin, one by one.",
  },
];

export default async function LandingPage() {
  const [session, settings] = await Promise.all([auth(), getSiteSettings()]);
  const ctaHref = session?.user ? "/dashboard" : "/login";
  const ctaLabel = session?.user ? "Dashboard" : "Login";
  const logoUrl = settings.logoUrl ?? "/logo.png";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <Image src={logoUrl} alt={settings.siteName} width={32} height={32} className="rounded-md" unoptimized />
            {settings.showLogoText && (
              <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {settings.siteName}
              </span>
            )}
          </div>
          <Link
            href={ctaHref}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
          >
            {ctaLabel}
          </Link>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-4 py-16 sm:px-6">
        <Image src={logoUrl} alt={settings.siteName} width={140} height={140} priority unoptimized />

        <h1 className="mt-6 text-center text-3xl font-semibold text-neutral-900 sm:text-4xl dark:text-neutral-50">
          Private image hosting
        </h1>
        <p className="mt-3 max-w-md text-center text-neutral-500 dark:text-neutral-400">
          Upload, share, and manage images with full control over who can see them.
          {!settings.registrationOpen && " No public registration — invite-only."}
        </p>

        <Link
          href={ctaHref}
          className="mt-8 rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
        >
          {session?.user ? "Go to Dashboard" : "Login to continue"}
        </Link>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">{feature.title}</h2>
              <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400 dark:border-neutral-800">
        © {new Date().getFullYear()} {settings.siteName}
      </footer>
    </div>
  );
}
