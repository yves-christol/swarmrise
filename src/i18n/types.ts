import 'i18next'
import type enCommon from './locales/en/common.json'
import type enOrgs from './locales/en/orgs.json'
import type enMembers from './locales/en/members.json'
import type enInvitations from './locales/en/invitations.json'
import type enAuth from './locales/en/auth.json'
import type enTeams from './locales/en/teams.json'
import type enGovernance from './locales/en/governance.json'
import type enLegal from './locales/en/legal.json'
import type enNotifications from './locales/en/notifications.json'
import type enDecisions from './locales/en/decisions.json'
import type enGlossary from './locales/en/glossary.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof enCommon
      orgs: typeof enOrgs
      members: typeof enMembers
      invitations: typeof enInvitations
      auth: typeof enAuth
      teams: typeof enTeams
      governance: typeof enGovernance
      legal: typeof enLegal
      notifications: typeof enNotifications
      decisions: typeof enDecisions
      glossary: typeof enGlossary
    }
  }
}
