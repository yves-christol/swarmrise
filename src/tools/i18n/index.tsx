import { createMemo } from 'solid-js'
import { store, setStore } from '../effects/store'

import type { Locale } from './locale'
import { locale, setLocale } from '../localStorage'

import i18n from './i18n.json'

export type Translator = {
  locale: Locale
  t: (text: string) => string
}

export const languages: Record<Locale, string> = {
  en: '🍞 English',
  fr: '🥖 Français',
  es: '🌮 Español',
  it: '🍕 Italiano',
  uk: '🥔 українська',
  'zh-TW': '🍚 中文'
}

export const getTranslator = (locale: Locale): Translator => {
  const t = (text: string) => {
    const found = i18n.find(element => element.en === text)
    return found ? found[locale] : text
  }
  return ({locale, t})
}

export const setTranslator = (locale: Locale) => {
  setLocale(locale)
  setStore('translator', getTranslator(locale))
}

export const getDefaultTranslator = (): Translator => {
  return getTranslator(locale())
}

export const useTranslator = () => {
  return createMemo(() => store.translator.t)
}