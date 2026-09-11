import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { getSiteSettings } from "@/lib/site-settings";
import { iconVariants } from "@/lib/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  // generateMetadata is inherited by every route, including Next's built-in
  // /_not-found — which gets statically prerendered at *build* time, so
  // this can run with no reachable database at all (e.g. during `docker
  // build`, before the app and its db ever run together). Fall back to
  // plain defaults rather than failing the whole build. This never hides a
  // real outage in production: if the database is actually down at request
  // time, every other page fails loudly anyway.
  const settings = await getSiteSettings().catch(() => null);
  if (!settings) {
    return {
      title: "dataq",
      description: "Private image hosting",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: settings.seoTitle || settings.siteName,
    description: settings.seoDescription || "Private image hosting",
    // Private, invite-only-by-default service — nothing here should show up
    // in search results unless the admin explicitly opens registration and
    // wants discoverability (that's a bigger toggle than we expose today).
    robots: { index: false, follow: false },
    // Only override the built-in favicon/apple-touch-icon convention files
    // (app/icon.png, app/apple-icon.png) once an admin has actually
    // uploaded a custom one.
    ...(settings.iconUrl
      ? {
          icons: {
            icon: [
              { url: iconVariants(settings.iconUrl).icon192, sizes: "192x192", type: "image/png" },
              { url: iconVariants(settings.iconUrl).icon512, sizes: "512x512", type: "image/png" },
            ],
            apple: iconVariants(settings.iconUrl).appleIcon,
          },
        }
      : {}),
    ...(settings.seoOgImageUrl
      ? { openGraph: { images: [settings.seoOgImageUrl] } }
      : {}),
  };
}

export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
