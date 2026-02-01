import { useState, useContext, createContext, ReactNode, useEffect, useCallback, useRef } from 'react'
import { useQuery } from 'convex/react'
import { useAuth } from '@clerk/clerk-react'
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
  // Auth state
  isSignedIn: boolean

  // Selection state
  selectedOrgaId: Id<"orgas"> | null
  selectedOrga: Orga | null
  selectOrga: (orgaId: Id<"orgas"> | null) => void

  // Organization data
  orgasWithCounts: OrgaWithCounts[] | undefined
  isLoading: boolean
  hasOrgas: boolean

  // Transition state - true when switching between organizations
  isSwitchingOrga: boolean
  // Internal: called by org-scoped hooks when they have finished loading
  _notifySwitchComplete: () => void
}

const OrgaStoreContext = createContext<OrgaStoreContextType | undefined>(undefined)

export const OrgaStoreProvider = ({ children }: { children: ReactNode }) => {
  const { isSignedIn, isLoaded: authLoaded } = useAuth()

  const [selectedOrgaId, setSelectedOrgaId] = useState<Id<"orgas"> | null>(() => {
    // Restore from localStorage on initial load
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? (stored as Id<"orgas">) : null
    }
    return null
  })

  // Track if we are switching between organizations
  const [isSwitchingOrga, setIsSwitchingOrga] = useState(false)
  // Track the previous orgaId to detect changes
  const previousOrgaIdRef = useRef<Id<"orgas"> | null>(null)

  // Only fetch organizations when the user is signed in
  const orgasWithCounts = useQuery(
    api.orgas.functions.listMyOrgasWithCounts,
    isSignedIn ? {} : "skip"
  )

  // Loading if auth is not loaded yet, or if signed in but orgas not yet loaded
  const isLoading = !authLoaded || (isSignedIn && orgasWithCounts === undefined)
  // Has orgas only when signed in and orgas are loaded with data
  const hasOrgas = isSignedIn === true && orgasWithCounts !== undefined && orgasWithCounts.length > 0

  // Derive selected organization from ID
  const selectedOrga = orgasWithCounts?.find(o => o.orga._id === selectedOrgaId)?.orga ?? null

  // Auto-select logic
  useEffect(() => {
    if (isLoading || !orgasWithCounts) return

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
    // Only set switching state if we are actually switching to a different org
    if (previousOrgaIdRef.current !== null && previousOrgaIdRef.current !== orgaId) {
      setIsSwitchingOrga(true)
    }
    setSelectedOrgaId(orgaId)
    if (orgaId) {
      localStorage.setItem(STORAGE_KEY, orgaId)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  // Track previous orgaId to update ref after render
  useEffect(() => {
    previousOrgaIdRef.current = selectedOrgaId
  }, [selectedOrgaId])

  // Internal function to notify that switching is complete
  const _notifySwitchComplete = useCallback(() => {
    setIsSwitchingOrga(false)
  }, [])

  return (
    <OrgaStoreContext.Provider value={{
      isSignedIn: isSignedIn === true,
      selectedOrgaId,
      selectedOrga,
      selectOrga,
      orgasWithCounts,
      isLoading,
      hasOrgas,
      isSwitchingOrga,
      _notifySwitchComplete,
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
  const { selectedOrga, selectedOrgaId, isLoading, isSwitchingOrga } = useOrgaStore()
  return { selectedOrga, selectedOrgaId, isLoading, isSwitchingOrga }
}

export const useOrgaList = () => {
  const { orgasWithCounts, isLoading, hasOrgas } = useOrgaStore()
  return { orgasWithCounts, isLoading, hasOrgas }
}

/**
 * Create an org-scoped query hook that properly handles switching state.
 * Returns undefined during org transitions to prevent stale data display.
 * Also notifies the store when switching is complete.
 */
const useOrgaScopedQuery = <T,>(
  queryResult: T | undefined,
  orgaIdUsedForQuery: Id<"orgas"> | null
): { data: T | undefined; isLoading: boolean } => {
  const { selectedOrgaId, isSwitchingOrga, _notifySwitchComplete } = useOrgaStore()
  const previousOrgaIdRef = useRef<Id<"orgas"> | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Detect when orgaId changes
  useEffect(() => {
    if (previousOrgaIdRef.current !== null && previousOrgaIdRef.current !== selectedOrgaId) {
      setIsTransitioning(true)
    }
    previousOrgaIdRef.current = selectedOrgaId
  }, [selectedOrgaId])

  // Clear transitioning when new data arrives for the current org
  useEffect(() => {
    if (
      queryResult !== undefined &&
      orgaIdUsedForQuery === selectedOrgaId &&
      isTransitioning
    ) {
      setIsTransitioning(false)
      // Also notify the store that switching is complete
      if (isSwitchingOrga) {
        _notifySwitchComplete()
      }
    }
  }, [queryResult, orgaIdUsedForQuery, selectedOrgaId, isTransitioning, isSwitchingOrga, _notifySwitchComplete])

  // During transition, return undefined to show loading state
  const isLoading = queryResult === undefined || isTransitioning
  const data = isTransitioning ? undefined : queryResult

  return { data, isLoading }
}

export const useMembers = (): { data: Member[] | undefined; isLoading: boolean } => {
  const { selectedOrgaId, isSignedIn } = useOrgaStore()
  const members = useQuery(
    api.members.functions.listMembers,
    isSignedIn && selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  )
  return useOrgaScopedQuery(members, selectedOrgaId)
}

export const useTeams = (): { data: Team[] | undefined; isLoading: boolean } => {
  const { selectedOrgaId, isSignedIn } = useOrgaStore()
  const teams = useQuery(
    api.teams.functions.listTeamsInOrga,
    isSignedIn && selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  )
  return useOrgaScopedQuery(teams, selectedOrgaId)
}

export const useRoles = (): { data: Role[] | undefined; isLoading: boolean } => {
  const { selectedOrgaId, isSignedIn } = useOrgaStore()
  const roles = useQuery(
    api.roles.functions.listRolesInOrga,
    isSignedIn && selectedOrgaId ? { orgaId: selectedOrgaId } : "skip"
  )
  return useOrgaScopedQuery(roles, selectedOrgaId)
}
