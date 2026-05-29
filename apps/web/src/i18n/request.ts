import { getRequestConfig } from "next-intl/server";

import { routing, type AppLocale } from "./routing";

export default getRequestConfig(async ({ locale }) => {
  const raw = locale ?? routing.defaultLocale;
  const resolved = (routing.locales as readonly string[]).includes(raw) ? (raw as AppLocale) : routing.defaultLocale;
  const messages = (await import(`../messages/${resolved}.json`)).default;
  return {
    locale: resolved,
    messages
  };
});

