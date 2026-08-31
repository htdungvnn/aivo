/**
 * AIVO i18n Configuration
 * 
 * Next-intl configuration for the web application.
 * Vietnamese (VN) is the default locale.
 */

import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the locale is supported
  if (!locale || !hasLocale(routing.locales, locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`@aivo/i18n/src/messages/${locale}`)).default,
  };
});
