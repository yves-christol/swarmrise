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

// Focus navigation types
export type FocusTarget =
  | { type: "orga" }
  | { type: "team"; teamId: Id<"teams"> }
  | { type: "role"; roleId: Id<"roles">; teamId: Id<"teams"> }
  | { type: "member"; memberId: Id<"members"> }

// Transition origin for zoom animations
export type TransitionOrigin = {
  x: number;
  y: number;
  radius: number;
} | null;

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

  // Focus navigation state
  focus: FocusTarget
  focusOnTeam: (teamId: Id<"teams">, origin?: TransitionOrigin) => void
  focusOnRole: (roleId: Id<"roles">, teamId: Id<"teams">, origin?: TransitionOrigin) => void
  focusOnMember: (memberId: Id<"members">, origin?: TransitionOrigin) => void
  focusOnTeamFromRole: () => void
  focusOnRoleFromMember: () => void
  focusOnTeamFromMember: (teamId: Id<"teams">) => void
  focusOnOrga: () => void
  isFocusTransitioning: boolean
  transitionOrigin: TransitionOrigin
  transitionDirection: "in" | "out" | null
  onTransitionEnd: () => void
  // Team to center on when returning from team view
  returnFromTeamId: Id<"teams"> | null
  clearReturnFromTeamId: () => void
  // Role to highlight when returning from role view
  returnFromRoleId: Id<"roles"> | null
  clearReturnFromRoleId: () => void
  // Member to highlight when returning from member view
  returnFromMemberId: Id<"members"> | null
  clearReturnFromMemberId: () => void
  // Store previous focus for back navigation from member view
  previousFocusFromMember: { type: "role"; roleId: Id<"roles">; teamId: Id<"teams"> } | null
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

  // Focus navigation state
  const [focus, setFocus] = useState<FocusTarget>({ type: "orga" })
  const [isFocusTransitioning, setIsFocusTransitioning] = useState(false)
  const [transitionOrigin, setTransitionOrigin] = useState<TransitionOrigin>(null)
  const [transitionDirection, setTransitionDirection] = useState<"in" | "out" | null>(null)
  // Track which team we're returning from so the org view can center on it
  const [returnFromTeamId, setReturnFromTeamId] = useState<Id<"teams"> | null>(null)
  // Track which role we're returning from so the team view can highlight it
  const [returnFromRoleId, setReturnFromRoleId] = useState<Id<"roles"> | null>(null)
  // Track which member we're returning from so the role view can highlight it
  const [returnFromMemberId, setReturnFromMemberId] = useState<Id<"members"> | null>(null)
  // Track previous focus to navigate back from member view
  const [previousFocusFromMember, setPreviousFocusFromMember] = useState<{ type: "role"; roleId: Id<"roles">; teamId: Id<"teams"> } | null>(null)

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

  // Clear switching state when the new org data is available
  // This is the primary mechanism - we don't rely on child components calling _notifySwitchComplete
  useEffect(() => {
    if (isSwitchingOrga && selectedOrga !== null) {
      // The new org is loaded and available, switching is complete
      setIsSwitchingOrga(false)
    }
  }, [isSwitchingOrga, selectedOrga])

  // Internal function to notify that switching is complete
  const _notifySwitchComplete = useCallback(() => {
    setIsSwitchingOrga(false)
  }, [])

  // Focus navigation functions
  const focusOnTeam = useCallback((teamId: Id<"teams">, origin?: TransitionOrigin) => {
    if (origin) {
      setTransitionOrigin(origin)
      setTransitionDirection("in")
      setIsFocusTransitioning(true)
    }
    setFocus({ type: "team", teamId })
  }, [])

  const focusOnRole = useCallback((roleId: Id<"roles">, teamId: Id<"teams">, origin?: TransitionOrigin) => {
    if (origin) {
      setTransitionOrigin(origin)
      setTransitionDirection("in")
      setIsFocusTransitioning(true)
    }
    setFocus({ type: "role", roleId, teamId })
  }, [])

  const focusOnMember = useCallback((memberId: Id<"members">, origin?: TransitionOrigin) => {
    // Store current focus for back navigation (only from role view)
    if (focus.type === "role") {
      setPreviousFocusFromMember({ type: "role", roleId: focus.roleId, teamId: focus.teamId })
    }
    if (origin) {
      setTransitionOrigin(origin)
      setTransitionDirection("in")
      setIsFocusTransitioning(true)
    }
    setFocus({ type: "member", memberId })
  }, [focus])

  // Focus back to team from role view
  const focusOnTeamFromRole = useCallback(() => {
    if (focus.type === "role") {
      setReturnFromRoleId(focus.roleId)
      setTransitionDirection("out")
      setIsFocusTransitioning(true)
      setFocus({ type: "team", teamId: focus.teamId })
    }
  }, [focus])

  // Focus back to role from member view
  const focusOnRoleFromMember = useCallback(() => {
    if (focus.type === "member" && previousFocusFromMember) {
      setReturnFromMemberId(focus.memberId)
      setTransitionDirection("out")
      setIsFocusTransitioning(true)
      setFocus(previousFocusFromMember)
      setPreviousFocusFromMember(null)
    }
  }, [focus, previousFocusFromMember])

  // Focus on team from member view (clicking a team node)
  const focusOnTeamFromMember = useCallback((teamId: Id<"teams">) => {
    if (focus.type === "member") {
      setReturnFromMemberId(focus.memberId)
      setTransitionDirection("out")
      setIsFocusTransitioning(true)
      setFocus({ type: "team", teamId })
      setPreviousFocusFromMember(null)
    }
  }, [focus])

  const focusOnOrga = useCallback(() => {
    // Capture the team we're returning from so the org view can center on it
    if (focus.type === "team") {
      setReturnFromTeamId(focus.teamId)
    } else if (focus.type === "role") {
      // If zooming from role directly to orga, capture the team
      setReturnFromTeamId(focus.teamId)
    }
    setTransitionDirection("out")
    setIsFocusTransitioning(true)
    setFocus({ type: "orga" })
  }, [focus])

  const clearReturnFromTeamId = useCallback(() => {
    setReturnFromTeamId(null)
  }, [])

  const clearReturnFromRoleId = useCallback(() => {
    setReturnFromRoleId(null)
  }, [])

  const clearReturnFromMemberId = useCallback(() => {
    setReturnFromMemberId(null)
  }, [])

  const onTransitionEnd = useCallback(() => {
    setIsFocusTransitioning(false)
    setTransitionDirection(null)
    // Keep origin for potential zoom-out animation
    if (transitionDirection === "out") {
      setTransitionOrigin(null)
    }
  }, [transitionDirection])

  // Reset focus when switching organizations
  useEffect(() => {
    if (isSwitchingOrga) {
      setFocus({ type: "orga" })
    }
  }, [isSwitchingOrga])

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
      focus,
      focusOnTeam,
      focusOnRole,
      focusOnMember,
      focusOnTeamFromRole,
      focusOnRoleFromMember,
      focusOnTeamFromMember,
      focusOnOrga,
      isFocusTransitioning,
      transitionOrigin,
      transitionDirection,
      onTransitionEnd,
      returnFromTeamId,
      clearReturnFromTeamId,
      returnFromRoleId,
      clearReturnFromRoleId,
      returnFromMemberId,
      clearReturnFromMemberId,
      previousFocusFromMember,
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

export const useFocus = () => {
  const { focus, focusOnTeam, focusOnRole, focusOnMember, focusOnTeamFromRole, focusOnRoleFromMember, focusOnTeamFromMember, focusOnOrga, isFocusTransitioning, transitionOrigin, transitionDirection, onTransitionEnd, returnFromTeamId, clearReturnFromTeamId, returnFromRoleId, clearReturnFromRoleId, returnFromMemberId, clearReturnFromMemberId, previousFocusFromMember } = useOrgaStore()
  return { focus, focusOnTeam, focusOnRole, focusOnMember, focusOnTeamFromRole, focusOnRoleFromMember, focusOnTeamFromMember, focusOnOrga, isFocusTransitioning, transitionOrigin, transitionDirection, onTransitionEnd, returnFromTeamId, clearReturnFromTeamId, returnFromRoleId, clearReturnFromRoleId, returnFromMemberId, clearReturnFromMemberId, previousFocusFromMember }
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
  const { selectedOrgaId, selectedOrga, isSignedIn } = useOrgaStore()
  // Only query if selectedOrga exists (validated against orgasWithCounts), not just selectedOrgaId (may be stale from localStorage)
  const members = useQuery(
    api.members.functions.listMembers,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  )
  return useOrgaScopedQuery(members, selectedOrgaId)
}

export const useTeams = (): { data: Team[] | undefined; isLoading: boolean } => {
  const { selectedOrgaId, selectedOrga, isSignedIn } = useOrgaStore()
  // Only query if selectedOrga exists (validated against orgasWithCounts), not just selectedOrgaId (may be stale from localStorage)
  const teams = useQuery(
    api.teams.functions.listTeamsInOrga,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  )
  return useOrgaScopedQuery(teams, selectedOrgaId)
}

export const useRoles = (): { data: Role[] | undefined; isLoading: boolean } => {
  const { selectedOrgaId, selectedOrga, isSignedIn } = useOrgaStore()
  // Only query if selectedOrga exists (validated against orgasWithCounts), not just selectedOrgaId (may be stale from localStorage)
  const roles = useQuery(
    api.roles.functions.listRolesInOrga,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  )
  return useOrgaScopedQuery(roles, selectedOrgaId)
}
