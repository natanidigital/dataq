import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/lib/site-settings";
import { iconVariants } from "@/lib/branding";

// Otherwise Next prerenders this once at build time, baking in whatever
// branding existed then — a Settings change wouldn't show up on the
// installed app's manifest without a full rebuild+redeploy.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  const icons = settings.iconUrl
    ? [
        { src: iconVariants(settings.iconUrl).icon192, sizes: "192x192", type: "image/png" },
        { src: iconVariants(settings.iconUrl).icon512, sizes: "512x512", type: "image/png" },
      ]
    : [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ];

  const title = settings.pwaTitle || settings.siteName;

  return {
    name: title,
    short_name: title,
    description: settings.seoDescription || "Private image hosting",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons,
  };
}
