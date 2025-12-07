import { useState, useContext, createContext, useMemo, ReactNode } from 'react'

import type { Locale } from './locale'
import { locale as getDefaultLocale, setLocale } from '../localStorage'

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
  return { locale, t }
}

export const setTranslator = (locale: Locale) => {
  setLocale(locale)
  // This will be handled by context update
}

export const getDefaultTranslator = (): Translator => {
  return getTranslator(getDefaultLocale())
}

// Create context for translator
type TranslatorContextType = {
  translator: Translator
  updateTranslator: (locale: Locale) => void
}

const TranslatorContext = createContext<TranslatorContextType | undefined>(undefined)

export const TranslatorProvider = ({ children }: { children: ReactNode }) => {
  const [translator, setTranslatorState] = useState<Translator>(getDefaultTranslator())

  const updateTranslator = (locale: Locale) => {
    setLocale(locale)
    setTranslatorState(getTranslator(locale))
  }

  return (
    <TranslatorContext.Provider value={{ translator, updateTranslator }}>
      {children}
    </TranslatorContext.Provider>
  )
}

export const useTranslator = () => {
  const context = useContext(TranslatorContext)
  if (!context) {
    throw new Error('useTranslator must be used within TranslatorProvider')
  }
  return useMemo(() => context.translator.t, [context.translator.t])
}

export const useTranslatorContext = () => {
  const context = useContext(TranslatorContext)
  if (!context) {
    throw new Error('useTranslatorContext must be used within TranslatorProvider')
  }
  return context
}