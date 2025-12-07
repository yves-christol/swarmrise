import type { Locale } from '../i18n/locale'
import { getLocaleFromString, isLocale } from '../i18n/locale'

const LOCALE_KEY = 'swarmrise_locale'

/**
 * Get the stored locale from localStorage
 * Falls back to browser language or 'en' if not stored
 */
export const locale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'en'
  }

  const stored = localStorage.getItem(LOCALE_KEY)
  if (stored && isLocale(stored)) {
    return stored
  }

  const detected = getLocaleFromString(stored || navigator.language)
  return detected
}

/**
 * Set and persist the locale to localStorage
 */
export const setLocale = (newLocale: Locale): void => {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(LOCALE_KEY, newLocale)
}
