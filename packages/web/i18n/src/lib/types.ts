/**
 * i18n Types
 */

export type Locale = 'en' | 'vn';

export interface LocaleConfig {
  locale: Locale;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

export interface I18nOptions {
  defaultLocale?: Locale;
  locales?: Locale[];
  localeConfigs?: Record<Locale, LocaleConfig>;
}

export type MessageKey = string;

export type Messages = Record<string, string | Record<string, string>>;
