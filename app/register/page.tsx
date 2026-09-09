import { redirect } from "next/navigation";

import RegisterForm from "@/components/RegisterForm";
import { getPublicSiteSettings } from "@/lib/site-settings";

// Same reasoning as app/login/page.tsx — must reflect the current
// registrationOpen toggle immediately, not whatever it was at build time.
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const settings = await getPublicSiteSettings();
  if (!settings.registrationOpen) {
    redirect("/login");
  }

  return (
    <RegisterForm
      siteName={settings.siteName}
      logoUrl={settings.logoUrl ?? "/logo.png"}
      showLogoText={settings.showLogoText}
    />
  );
}
