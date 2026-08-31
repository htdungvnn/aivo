/**
 * Combined Messages
 * 
 * This file combines all locale messages for next-intl.
 * Locales are loaded dynamically based on the user's language.
 */

import { getRequestConfig } from 'next-intl/server';
import vn from './vn';
import en from './en';

const messages = {
  vn,
  en,
};

export default messages;

export function getMessages(locale: string) {
  return messages[locale as keyof typeof messages] || messages.vn;
}
