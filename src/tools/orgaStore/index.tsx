import { useState, useContext, createContext, ReactNode, useEffect, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import type { Member } from '../../../convex/members'
import type { Team } from '../../../convex/teams'
import type { Role } from '../../../convex/roles'
import type { Infer } from 'convex/values'
import type { orgaValidator } from '../../../convex/orgas'

type Orga = Infer<typeof orgaValidator>

type OrgaWithCounts = {
  orga: Orga
  counts: {
    members: number
    teams: number
    roles: number
  }
}

const STORAGE_KEY = 'swarmrise_selected_orga'

type OrgaStoreContextType = {
  // Selection state
  selectedOrgaId: Id<"orgas"> | null
  selectedOrga: Orga | null
  selectOrga: (orgaId: Id<"orgas"> | null) => void

  // Organization data
  orgasWithCounts: OrgaWithCounts[] | undefined
  isLoading: boolean
  hasOrgas: boolean
}

const OrgaStoreContext = createContext<OrgaStoreContextType | undefined>(undefined)

export const OrgaStoreProvider = ({ children }: { children: ReactNode }) => {
  const [selectedOrgaId, setSelectedOrgaId] = useState<Id<"orgas"> | null>(() => {
    // Restore from localStorage on initial load
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? (stored as Id<"orgas">) : null
    }
    return null
  })

  // Fetch organizations
  const orgasWithCounts = useQuery(api.orgas.functions.listMyOrgasWithCounts)

  const isLoading = orgasWithCounts === undefined
  const hasOrgas = !isLoading && orgasWithCounts.length > 0

  // Derive selected organization from ID
  const selectedOrga = orgasWithCounts?.find(o => o.orga._id === selectedOrgaId)?.orga ?? null

  // Auto-select logic
  useEffect(() => {
    if (isLoading) return

    // If we have a selection but it's no longer valid, clear it
    if (selectedOrgaId && !orgasWithCounts.find(o => o.orga._id === selectedOrgaId)) {
      setSelectedOrgaId(null)
      localStorage.removeItem(STORAGE_KEY)
      return
    }

    // If no selection and we have exactly one org, auto-select it
    if (!selectedOrgaId && orgasWithCounts.length === 1) {
      const onlyOrgId = orgasWithCounts[0].orga._id
      setSelectedOrgaId(onlyOrgId)
      localStorage.setItem(STORAGE_KEY, onlyOrgId)
      return
    }

    // If no selection and we have multiple orgs, try to restore from storage
    if (!selectedOrgaId && orgasWithCounts.length > 1) {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && orgasWithCounts.find(o => o.orga._id === stored)) {
        setSelectedOrgaId(stored as Id<"orgas">)
      }
    }
  }, [isLoading, selectedOrgaId, orgasWithCounts])

  const selectOrga = useCallback((orgaId: Id<"orgas"> | null) => {
    setSelectedOrgaId(orgaId)
    if (orgaId) {
      localStorage.setItem(STORAGE_KEY, orgaId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return (
    <OrgaStoreContext.Provider value={{
      selectedOrgaId,
      selectedOrga,
      selectOrga,
      orgasWithCounts,
      isLoading,
      hasOrgas
    }}>
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

// Convenience hooks for common data needs

export const useSelectedOrga = () => {
  const { selectedOrga, selectedOrgaId, isLoading } = useOrgaStore()
  return { selectedOrga, selectedOrgaId, isLoading }
}

export const useOrgaList = () => {
  const { orgasWithCounts, isLoading, hasOrgas } = useOrgaStore()
  return { orgasWithCounts, isLoading, hasOrgas }
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
