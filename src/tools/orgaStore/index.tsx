import { useState, useContext, createContext, ReactNode } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import type { Member } from '../../../convex/members'
import type { Team } from '../../../convex/teams'
import type { Role } from '../../../convex/roles'

type OrgaStoreContextType = {
  selectedOrgaId: Id<"orgas"> | null
  selectOrga: (orgaId: Id<"orgas"> | null) => void
}

const OrgaStoreContext = createContext<OrgaStoreContextType | undefined>(undefined)

export const OrgaStoreProvider = ({ children }: { children: ReactNode }) => {
  const [selectedOrgaId, setSelectedOrgaId] = useState<Id<"orgas"> | null>(null)

  const selectOrga = (orgaId: Id<"orgas"> | null) => {
    setSelectedOrgaId(orgaId)
  }

  return (
    <OrgaStoreContext.Provider value={{ selectedOrgaId, selectOrga }}>
      {children}
    </OrgaStoreContext.Provider>
  )
}

export const useOrgaStore = () => {
  const context = useContext(OrgaStoreContext)
  if (!context) {
    throw new Error('useOrgaStore must be used within OrgaStoreProvider')
  }
  return context
}

export const useMembers = (): Member[] | undefined => {
  const { selectedOrgaId } = useOrgaStore()
  const members = useQuery(
    api.members.functions.listMembers,
    selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  )
  return members
}

export const useTeams = (): Team[] | undefined => {
  const { selectedOrgaId } = useOrgaStore()
  const teams = useQuery(
    api.teams.functions.listTeamsInOrga,
    selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  )
  return teams
}

export const useRoles = (): Role[] | undefined => {
  const { selectedOrgaId } = useOrgaStore()
  const roles = useQuery(
    api.roles.functions.listRolesInOrga,
    selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  )
  return roles
}
