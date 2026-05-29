export const routing = {
  locales: ["en", "ar"] as const,
  defaultLocale: "en" as const,
  localePrefix: "always" as const
};

export type AppLocale = (typeof routing.locales)[number];

