import { useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { OrgaStoreContext } from "./context";
import type { FocusTarget, TransitionOrigin, ViewMode, SwapPhase, SwapDirection } from "./types";

// Re-export types
export type { ViewMode, SwapPhase, SwapDirection, FocusTarget, TransitionOrigin, OrgaWithCounts, OrgaStoreContextType } from "./types";

// Re-export hooks
export { useOrgaStore, useSelectedOrga, useOrgaList, useFocus, useViewMode } from "./hooks";

// Re-export data hooks
export { useMembers, useTeams, useRoles } from "./dataHooks";

const STORAGE_KEY = "swarmrise_selected_orga";

export const OrgaStoreProvider = ({ children }: { children: ReactNode }) => {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  const [selectedOrgaId, setSelectedOrgaId] = useState<Id<"orgas"> | null>(() => {
    // Restore from localStorage on initial load
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (stored as Id<"orgas">) : null;
    }
    return null;
  });

  // Track if we are switching between organizations
  const [isSwitchingOrga, setIsSwitchingOrga] = useState(false);
  // Track the previous orgaId to detect changes
  const previousOrgaIdRef = useRef<Id<"orgas"> | null>(null);

  // Focus navigation state
  const [focus, setFocus] = useState<FocusTarget>({ type: "orga" });
  const [isFocusTransitioning, setIsFocusTransitioning] = useState(false);
  const [transitionOrigin, setTransitionOrigin] = useState<TransitionOrigin>(null);
  const [transitionDirection, setTransitionDirection] = useState<"in" | "out" | null>(null);
  // Track which team we're returning from so the org view can center on it
  const [returnFromTeamId, setReturnFromTeamId] = useState<Id<"teams"> | null>(null);
  // Track which role we're returning from so the team view can highlight it
  const [returnFromRoleId, setReturnFromRoleId] = useState<Id<"roles"> | null>(null);
  // Track which member we're returning from so the role view can highlight it
  const [returnFromMemberId, setReturnFromMemberId] = useState<Id<"members"> | null>(null);
  // Track previous focus to navigate back from member view
  const [previousFocusFromMember, setPreviousFocusFromMember] = useState<{
    type: "role";
    roleId: Id<"roles">;
    teamId: Id<"teams">;
  } | null>(null);

  // View mode state (visual vs manage) with swap animation
  const [viewMode, setViewModeState] = useState<ViewMode>("visual");
  const [displayedMode, setDisplayedMode] = useState<ViewMode>("visual");
  const [swapPhase, setSwapPhase] = useState<SwapPhase>("idle");
  const [swapDirection, setSwapDirection] = useState<SwapDirection>("up");

  const SWAP_DURATION = 350; // ms

  const setViewMode = useCallback(
    (newMode: ViewMode) => {
      if (newMode === viewMode || swapPhase !== "idle") return;

      // Determine direction: visual->manage = up, manage->visual = down
      setSwapDirection(newMode === "manage" ? "up" : "down");
      setSwapPhase("swapping-out");

      setTimeout(() => {
        setDisplayedMode(newMode);
        setSwapPhase("swapping-in");
      }, SWAP_DURATION / 2);

      setTimeout(() => {
        setViewModeState(newMode);
        setSwapPhase("idle");
      }, SWAP_DURATION);
    },
    [viewMode, swapPhase]
  );

  // Route-driven focus update (no animation, instant sync)
  const setFocusFromRoute = useCallback((newFocus: FocusTarget) => {
    // Skip the initial focus logic when route-driven
    hasSetInitialFocusRef.current = true;
    setFocus(newFocus);
  }, []);

  // Route-driven view mode update (no animation)
  const setViewModeFromRoute = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    setDisplayedMode(mode);
    setSwapPhase("idle");
  }, []);

  // Reset view mode when navigating to different entity
  useEffect(() => {
    if (isFocusTransitioning) {
      setViewModeState("visual");
      setDisplayedMode("visual");
      setSwapPhase("idle");
    }
  }, [isFocusTransitioning]);

  // Only fetch organizations when the user is signed in
  const orgasWithCounts = useQuery(api.orgas.functions.listMyOrgasWithCounts, isSignedIn ? {} : "skip");

  // Loading if auth is not loaded yet, or if signed in but orgas not yet loaded
  const isLoading = !authLoaded || (isSignedIn && orgasWithCounts === undefined);
  // Has orgas only when signed in and orgas are loaded with data
  const hasOrgas = isSignedIn === true && orgasWithCounts !== undefined && orgasWithCounts.length > 0;

  // Derive selected organization from ID
  const selectedOrga = orgasWithCounts?.find((o) => o.orga._id === selectedOrgaId)?.orga ?? null;

  // Fetch current user's member in the selected organization ("You come first")
  const myMember = useQuery(
    api.members.functions.getMyMember,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );

  // Track if we've already set the initial focus for the current org
  const hasSetInitialFocusRef = useRef(false);

  // Auto-select logic
  useEffect(() => {
    if (isLoading || !orgasWithCounts) return;

    // If we have a selection but it's no longer valid, clear it
    if (selectedOrgaId && !orgasWithCounts.find((o) => o.orga._id === selectedOrgaId)) {
      setSelectedOrgaId(null);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    // If no selection and we have exactly one org, auto-select it
    if (!selectedOrgaId && orgasWithCounts.length === 1) {
      const onlyOrgId = orgasWithCounts[0].orga._id;
      setSelectedOrgaId(onlyOrgId);
      localStorage.setItem(STORAGE_KEY, onlyOrgId);
      return;
    }

    // If no selection and we have multiple orgs, try to restore from storage
    if (!selectedOrgaId && orgasWithCounts.length > 1) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && orgasWithCounts.find((o) => o.orga._id === stored)) {
        setSelectedOrgaId(stored as Id<"orgas">);
      }
    }
  }, [isLoading, selectedOrgaId, orgasWithCounts]);

  const selectOrga = useCallback((orgaId: Id<"orgas"> | null) => {
    // Only set switching state if we are actually switching to a different org
    if (previousOrgaIdRef.current !== null && previousOrgaIdRef.current !== orgaId) {
      setIsSwitchingOrga(true);
    }
    setSelectedOrgaId(orgaId);
    if (orgaId) {
      localStorage.setItem(STORAGE_KEY, orgaId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Track previous orgaId to update ref after render
  useEffect(() => {
    previousOrgaIdRef.current = selectedOrgaId;
  }, [selectedOrgaId]);

  // Clear switching state when the new org data is available
  useEffect(() => {
    if (isSwitchingOrga && selectedOrga !== null) {
      setIsSwitchingOrga(false);
    }
  }, [isSwitchingOrga, selectedOrga]);

  // Internal function to notify that switching is complete
  const _notifySwitchComplete = useCallback(() => {
    setIsSwitchingOrga(false);
  }, []);

  // Focus navigation functions
  const focusOnTeam = useCallback((teamId: Id<"teams">, origin?: TransitionOrigin) => {
    if (origin) {
      setTransitionOrigin(origin);
      setTransitionDirection("in");
      setIsFocusTransitioning(true);
    }
    setFocus({ type: "team", teamId });
  }, []);

  const focusOnRole = useCallback((roleId: Id<"roles">, teamId: Id<"teams">, origin?: TransitionOrigin) => {
    if (origin) {
      setTransitionOrigin(origin);
      setTransitionDirection("in");
      setIsFocusTransitioning(true);
    }
    setFocus({ type: "role", roleId, teamId });
  }, []);

  const focusOnMember = useCallback(
    (memberId: Id<"members">, origin?: TransitionOrigin) => {
      // Store current focus for back navigation (only from role view)
      if (focus.type === "role") {
        setPreviousFocusFromMember({ type: "role", roleId: focus.roleId, teamId: focus.teamId });
      }
      if (origin) {
        setTransitionOrigin(origin);
        setTransitionDirection("in");
        setIsFocusTransitioning(true);
      }
      setFocus({ type: "member", memberId });
    },
    [focus]
  );

  // Focus back to team from role view
  const focusOnTeamFromRole = useCallback(() => {
    if (focus.type === "role") {
      setReturnFromRoleId(focus.roleId);
      setTransitionDirection("out");
      setIsFocusTransitioning(true);
      setFocus({ type: "team", teamId: focus.teamId });
    }
  }, [focus]);

  // Focus back to role from member view
  const focusOnRoleFromMember = useCallback(() => {
    if (focus.type === "member" && previousFocusFromMember) {
      setReturnFromMemberId(focus.memberId);
      setTransitionDirection("out");
      setIsFocusTransitioning(true);
      setFocus(previousFocusFromMember);
      setPreviousFocusFromMember(null);
    }
  }, [focus, previousFocusFromMember]);

  // Focus on team from member view (clicking a team node)
  const focusOnTeamFromMember = useCallback(
    (teamId: Id<"teams">) => {
      if (focus.type === "member") {
        setReturnFromMemberId(focus.memberId);
        setTransitionDirection("out");
        setIsFocusTransitioning(true);
        setFocus({ type: "team", teamId });
        setPreviousFocusFromMember(null);
      }
    },
    [focus]
  );

  // Focus back to org from member view (when started on member view via "You come first")
  const focusOnOrgaFromMember = useCallback(() => {
    if (focus.type === "member") {
      setReturnFromMemberId(focus.memberId);
      setTransitionDirection("out");
      setIsFocusTransitioning(true);
      setFocus({ type: "orga" });
      setPreviousFocusFromMember(null);
    }
  }, [focus]);

  const focusOnOrga = useCallback(() => {
    // Capture the team we're returning from so the org view can center on it
    if (focus.type === "team") {
      setReturnFromTeamId(focus.teamId);
    } else if (focus.type === "role") {
      // If zooming from role directly to orga, capture the team
      setReturnFromTeamId(focus.teamId);
    }
    setTransitionDirection("out");
    setIsFocusTransitioning(true);
    setFocus({ type: "orga" });
  }, [focus]);

  const clearReturnFromTeamId = useCallback(() => {
    setReturnFromTeamId(null);
  }, []);

  const clearReturnFromRoleId = useCallback(() => {
    setReturnFromRoleId(null);
  }, []);

  const clearReturnFromMemberId = useCallback(() => {
    setReturnFromMemberId(null);
  }, []);

  const onTransitionEnd = useCallback(() => {
    setIsFocusTransitioning(false);
    setTransitionDirection(null);
    // Keep origin for potential zoom-out animation
    if (transitionDirection === "out") {
      setTransitionOrigin(null);
    }
  }, [transitionDirection]);

  // Reset focus when switching organizations
  useEffect(() => {
    if (isSwitchingOrga) {
      // Reset the initial focus flag when starting to switch
      hasSetInitialFocusRef.current = false;
      setFocus({ type: "orga" });
    }
  }, [isSwitchingOrga]);

  // "You come first": Set default focus to current user's member view when org is loaded
  useEffect(() => {
    // Only set initial focus once per org selection
    if (hasSetInitialFocusRef.current) return;
    // Wait until we have the myMember data
    if (myMember === undefined) return;
    // Only if there's no transition happening
    if (isSwitchingOrga || isFocusTransitioning) return;
    // Only if current focus is still the default orga view
    if (focus.type !== "orga") return;

    hasSetInitialFocusRef.current = true;

    // If we have myMember, focus on them
    if (myMember !== null) {
      setFocus({ type: "member", memberId: myMember._id });
    }
    // If myMember is null (shouldn't happen normally), stay on orga view
  }, [myMember, isSwitchingOrga, isFocusTransitioning, focus.type]);

  return (
    <OrgaStoreContext.Provider
      value={{
        isSignedIn: isSignedIn === true,
        selectedOrgaId,
        selectedOrga,
        selectOrga,
        orgasWithCounts,
        isLoading,
        hasOrgas,
        myMember,
        isSwitchingOrga,
        _notifySwitchComplete,
        focus,
        focusOnTeam,
        focusOnRole,
        focusOnMember,
        focusOnTeamFromRole,
        focusOnRoleFromMember,
        focusOnTeamFromMember,
        focusOnOrgaFromMember,
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
        viewMode,
        swapPhase,
        swapDirection,
        displayedMode,
        setViewMode,
        setFocusFromRoute,
        setViewModeFromRoute,
      }}
    >
      {children}
    </OrgaStoreContext.Provider>
  );
};
