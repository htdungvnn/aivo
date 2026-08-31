/**
 * i18n Core Library
 */

import { createI18n as createNextIntlI18n } from 'next-intl';
import { locales, defaultLocale, localeConfigs } from './config';
import type { I18nOptions } from './types';

export function createI18n(options: I18nOptions = {}) {
  const {
    defaultLocale: optDefaultLocale,
    locales: optLocales,
    localeConfigs: optLocaleConfigs,
  } = options;

  return createNextIntlI18n({
    localePrefix: 'as-needed',
    messages: () => import('../messages').then((module) => module.default),
    defaultLocale: optDefaultLocale ?? defaultLocale,
    locales: optLocales ?? locales,
    localeConfigs: {
      vn: {
        ...localeConfigs.vn,
        ...optLocaleConfigs?.vn,
      },
      en: {
        ...localeConfigs.en,
        ...optLocaleConfigs?.en,
      },
    },
  });
}

export { locales, defaultLocale, localeConfigs };
