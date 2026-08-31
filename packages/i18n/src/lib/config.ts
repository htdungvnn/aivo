/**
 * i18n Configuration
 * 
 * Configures locale settings for the AIVO platform.
 * Vietnamese (VN) is set as the default locale.
 */

import { getRequestConfig } from 'next-intl/server';
import { Locale, LocaleConfig } from './types';

export const locales: Locale[] = ['vn', 'en'];
export const defaultLocale: Locale = 'vn';

export const localeConfigs: Record<Locale, LocaleConfig> = {
  vn: {
    locale: 'vn',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    dir: 'ltr',
  },
  en: {
    locale: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
  },
};

export { getRequestConfig };
