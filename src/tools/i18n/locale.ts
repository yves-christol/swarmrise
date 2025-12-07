export const locales = ['en', 'fr', 'es', 'it', 'uk', 'zh-TW'] as const
type LocaleTuple = typeof locales

export type Locale = LocaleTuple[number]

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}

export const getLocaleFromString = (value: string): Locale => {
  const locale = value || navigator.language.substring(0, 2) || 'en'
  if (isLocale(locale)) {
    return locale as Locale
  } else {
    return 'en'
  }
}
