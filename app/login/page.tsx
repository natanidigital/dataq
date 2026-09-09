import LoginForm from "@/components/LoginForm";
import { getPublicSiteSettings } from "@/lib/site-settings";

// This page reads no cookies/headers, so Next would otherwise prerender it
// once at build time — baking in whatever branding/registrationOpen value
// existed then. Settings are meant to take effect immediately from the
// Settings page, without a rebuild, so this must render per-request.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const settings = await getPublicSiteSettings();

  return (
    <LoginForm
      siteName={settings.siteName}
      logoUrl={settings.logoUrl ?? "/logo.png"}
      showLogoText={settings.showLogoText}
      registrationOpen={settings.registrationOpen}
    />
  );
}
