/**
 * AIVO i18n Routing Configuration
 * 
 * Defines supported locales and routing behavior.
 */

import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const locales = ['vn', 'en'] as const;
export const defaultLocale = 'vn';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
