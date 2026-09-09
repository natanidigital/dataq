export type SiteSettingsDto = {
  id: string;
  siteName: string;
  logoUrl: string | null;
  showLogoText: boolean;
  iconUrl: string | null;
  pwaTitle: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoOgImageUrl: string | null;
  registrationOpen: boolean;
  freeMaxImages: number;
  freeMaxStorageMB: number;
  paidPriceUsd: number;
  paypalMode: string | null;
  paypalClientId: string | null;
  paypalWebhookId: string | null;
  paypalPlanId: string | null;
  /** True if a secret is on file — the actual value is never sent to the client. */
  hasPaypalClientSecret: boolean;
};
