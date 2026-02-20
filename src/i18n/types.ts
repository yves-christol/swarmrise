import 'i18next'
import type enCommon from '../../public/locales/en/common.json'
import type enOrgs from '../../public/locales/en/orgs.json'
import type enMembers from '../../public/locales/en/members.json'
import type enInvitations from '../../public/locales/en/invitations.json'
import type enAuth from '../../public/locales/en/auth.json'
import type enTeams from '../../public/locales/en/teams.json'
import type enGovernance from '../../public/locales/en/governance.json'
import type enLegal from '../../public/locales/en/legal.json'
import type enNotifications from '../../public/locales/en/notifications.json'
import type enDecisions from '../../public/locales/en/decisions.json'
import type enGlossary from '../../public/locales/en/glossary.json'
import type enChat from '../../public/locales/en/chat.json'
import type enKanban from '../../public/locales/en/kanban.json'
import type enWelcome from '../../public/locales/en/welcome.json'
import type enBugReport from '../../public/locales/en/bugReport.json'

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
      chat: typeof enChat
      kanban: typeof enKanban
      welcome: typeof enWelcome
      bugReport: typeof enBugReport
    }
  }
}
