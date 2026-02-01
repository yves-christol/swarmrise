import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import English translations (default)
import enCommon from './locales/en/common.json'
import enOrgs from './locales/en/orgs.json'
import enMembers from './locales/en/members.json'
import enInvitations from './locales/en/invitations.json'
import enAuth from './locales/en/auth.json'
import enTeams from './locales/en/teams.json'
import enGovernance from './locales/en/governance.json'

// Import French translations
import frCommon from './locales/fr/common.json'
import frOrgs from './locales/fr/orgs.json'
import frMembers from './locales/fr/members.json'
import frInvitations from './locales/fr/invitations.json'
import frAuth from './locales/fr/auth.json'
import frTeams from './locales/fr/teams.json'
import frGovernance from './locales/fr/governance.json'

// Import Spanish translations
import esCommon from './locales/es/common.json'
import esOrgs from './locales/es/orgs.json'
import esMembers from './locales/es/members.json'
import esInvitations from './locales/es/invitations.json'
import esAuth from './locales/es/auth.json'
import esTeams from './locales/es/teams.json'
import esGovernance from './locales/es/governance.json'

// Import Italian translations
import itCommon from './locales/it/common.json'
import itOrgs from './locales/it/orgs.json'
import itMembers from './locales/it/members.json'
import itInvitations from './locales/it/invitations.json'
import itAuth from './locales/it/auth.json'
import itTeams from './locales/it/teams.json'
import itGovernance from './locales/it/governance.json'

// Import Ukrainian translations
import ukCommon from './locales/uk/common.json'
import ukOrgs from './locales/uk/orgs.json'
import ukMembers from './locales/uk/members.json'
import ukInvitations from './locales/uk/invitations.json'
import ukAuth from './locales/uk/auth.json'
import ukTeams from './locales/uk/teams.json'
import ukGovernance from './locales/uk/governance.json'

// Import Traditional Chinese translations
import zhTWCommon from './locales/zh-TW/common.json'
import zhTWOrgs from './locales/zh-TW/orgs.json'
import zhTWMembers from './locales/zh-TW/members.json'
import zhTWInvitations from './locales/zh-TW/invitations.json'
import zhTWAuth from './locales/zh-TW/auth.json'
import zhTWTeams from './locales/zh-TW/teams.json'
import zhTWGovernance from './locales/zh-TW/governance.json'

export const supportedLanguages = ['en', 'fr', 'es', 'it', 'uk', 'zh-TW'] as const
export type SupportedLanguage = typeof supportedLanguages[number]

export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  uk: 'Українська',
  'zh-TW': '繁體中文'
}

const resources = {
  en: {
    common: enCommon,
    orgs: enOrgs,
    members: enMembers,
    invitations: enInvitations,
    auth: enAuth,
    teams: enTeams,
    governance: enGovernance
  },
  fr: {
    common: frCommon,
    orgs: frOrgs,
    members: frMembers,
    invitations: frInvitations,
    auth: frAuth,
    teams: frTeams,
    governance: frGovernance
  },
  es: {
    common: esCommon,
    orgs: esOrgs,
    members: esMembers,
    invitations: esInvitations,
    auth: esAuth,
    teams: esTeams,
    governance: esGovernance
  },
  it: {
    common: itCommon,
    orgs: itOrgs,
    members: itMembers,
    invitations: itInvitations,
    auth: itAuth,
    teams: itTeams,
    governance: itGovernance
  },
  uk: {
    common: ukCommon,
    orgs: ukOrgs,
    members: ukMembers,
    invitations: ukInvitations,
    auth: ukAuth,
    teams: ukTeams,
    governance: ukGovernance
  },
  'zh-TW': {
    common: zhTWCommon,
    orgs: zhTWOrgs,
    members: zhTWMembers,
    invitations: zhTWInvitations,
    auth: zhTWAuth,
    teams: zhTWTeams,
    governance: zhTWGovernance
  }
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'orgs', 'members', 'invitations', 'auth', 'teams', 'governance'],
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    }
  })

export default i18n
