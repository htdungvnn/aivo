/**
 * AIVO i18n Configuration
 * 
 * Next-intl configuration for the web application.
 * Vietnamese (VN) is the default locale.
 */

import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

const messageModules = {
  en: () => import('@aivo/i18n/messages/en'),
  vn: () => import('@aivo/i18n/messages/vn'),
};

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the locale is supported
  if (!locale || !hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  const loadFn = messageModules[locale as keyof typeof messageModules] ?? messageModules.en;
  const loadedMessages = await loadFn();

  return {
    locale,
    messages: loadedMessages.default,
  };
});
