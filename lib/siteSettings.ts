export type SiteSettingsValue = {
  whatsappNumber: string;
  instagramUrl: string;
  tiktokUrl: string;
  returnPolicyText: string;
  shippingPolicyText: string;
  supportEmail: string;
  supportPhone: string;
  announcementText: string;
};

export const defaultSiteSettings: SiteSettingsValue = {
  whatsappNumber: "",
  instagramUrl: "",
  tiktokUrl: "",
  returnPolicyText: "",
  shippingPolicyText: "",
  supportEmail: "",
  supportPhone: "",
  announcementText: "",
};

export function withDefaultSiteSettings(
  value: Partial<SiteSettingsValue> | null | undefined,
): SiteSettingsValue {
  return {
    ...defaultSiteSettings,
    ...(value || {}),
  };
}
