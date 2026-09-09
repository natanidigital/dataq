"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export default function Header({
  username,
  role,
  siteName,
  logoUrl,
  showLogoText,
}: {
  username: string;
  role: "ADMIN" | "USER";
  siteName: string;
  logoUrl: string;
  showLogoText: boolean;
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            <Image src={logoUrl} alt="" width={40} height={40} unoptimized />
            {showLogoText && siteName}
          </Link>
          {role === "ADMIN" && (
            <>
              <Link
                href="/admin/users"
                className={`text-sm font-medium ${
                  pathname.startsWith("/admin/users")
                    ? "text-neutral-900 dark:text-neutral-50"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                Users
              </Link>
              <Link
                href="/admin/settings"
                className={`text-sm font-medium ${
                  pathname.startsWith("/admin/settings")
                    ? "text-neutral-900 dark:text-neutral-50"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                }`}
              >
                Settings
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-neutral-500 sm:inline dark:text-neutral-400">{username}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-center text-sm font-medium text-neutral-700 transition hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
