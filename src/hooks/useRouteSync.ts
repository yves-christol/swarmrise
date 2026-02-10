import { useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router";
import { Id } from "../../convex/_generated/dataModel";
import { useOrgaStore } from "../tools/orgaStore";
import type { FocusTarget, ViewMode } from "../tools/orgaStore/types";
import { routes } from "../routes";

/**
 * Calculate the depth of a focus target for animation direction.
 * orga: 0, team: 1, role: 2, member: 2
 */
function getFocusDepth(focus: FocusTarget): number {
  switch (focus.type) {
    case "orga":
      return 0;
    case "team":
      return 1;
    case "role":
      return 2;
    case "member":
      return 2;
  }
}

/**
 * Determine animation direction when navigating between focus targets.
 * Returns "in" when going deeper, "out" when going shallower.
 */
function getNavigationDirection(from: FocusTarget, to: FocusTarget): "in" | "out" {
  const fromDepth = getFocusDepth(from);
  const toDepth = getFocusDepth(to);

  if (toDepth > fromDepth) {
    return "in";
  } else if (toDepth < fromDepth) {
    return "out";
  }

  // Same depth - check if it's a different entity type (role <-> member)
  if (from.type !== to.type) {
    // Member to role = out (going to structure), role to member = in (going to person)
    return to.type === "member" ? "in" : "out";
  }

  // Same type, different entity - default to "in" (feels like navigating forward)
  return "in";
}

type RouteParams = {
  orgaId?: string;
  teamId?: string;
  roleId?: string;
  memberId?: string;
};

/**
 * Parses the current URL into focus state and view mode.
 * Returns null if not on an org route.
 */
function parseRouteToFocus(
  params: RouteParams,
  pathname: string
): { focus: FocusTarget; viewMode: ViewMode } | null {
  const { orgaId, teamId, roleId, memberId } = params;

  if (!orgaId) return null;

  const isManageView = pathname.endsWith("/manage");
  const viewMode: ViewMode = isManageView ? "manage" : "visual";

  // Member route: /o/:orgaId/members/:memberId
  if (memberId) {
    return {
      focus: { type: "member", memberId: memberId as Id<"members"> },
      viewMode,
    };
  }

  // Role route: /o/:orgaId/teams/:teamId/roles/:roleId
  if (roleId && teamId) {
    return {
      focus: {
        type: "role",
        roleId: roleId as Id<"roles">,
        teamId: teamId as Id<"teams">,
      },
      viewMode,
    };
  }

  // Team route: /o/:orgaId/teams/:teamId
  if (teamId) {
    return {
      focus: { type: "team", teamId: teamId as Id<"teams"> },
      viewMode,
    };
  }

  // Org route: /o/:orgaId
  return {
    focus: { type: "orga" },
    viewMode,
  };
}

/**
 * Builds a URL path from focus state and view mode.
 */
export function buildUrlFromFocus(
  orgaId: Id<"orgas">,
  focus: FocusTarget,
  viewMode: ViewMode
): string {
  const isManage = viewMode === "manage";

  switch (focus.type) {
    case "member":
      return isManage
        ? routes.memberManage(orgaId, focus.memberId)
        : routes.member(orgaId, focus.memberId);

    case "role":
      return isManage
        ? routes.roleManage(orgaId, focus.teamId, focus.roleId)
        : routes.role(orgaId, focus.teamId, focus.roleId);

    case "team":
      return isManage
        ? routes.teamManage(orgaId, focus.teamId)
        : routes.team(orgaId, focus.teamId);

    case "orga":
    default:
      return isManage ? routes.orgaManage(orgaId) : routes.orga(orgaId);
  }
}

/**
 * Compares two focus targets for equality.
 */
function focusEquals(a: FocusTarget, b: FocusTarget): boolean {
  if (a.type !== b.type) return false;

  switch (a.type) {
    case "orga":
      return true;
    case "team":
      return b.type === "team" && a.teamId === b.teamId;
    case "role":
      return (
        b.type === "role" && a.roleId === b.roleId && a.teamId === b.teamId
      );
    case "member":
      return b.type === "member" && a.memberId === b.memberId;
  }
}

/**
 * Hook that synchronizes URL with focus state.
 *
 * Two-way sync with clear ownership:
 * 1. URL changes (browser nav, direct URL) → update focus (URL is source of truth)
 * 2. Focus changes (user clicks) → update URL (focus drives URL)
 *
 * Key insight: We track the LAST KNOWN pathname to distinguish between:
 * - URL actually changed (browser nav) → sync focus FROM URL
 * - Focus changed (user click) → sync URL FROM focus
 */
export function useRouteSync() {
  const params = useParams<RouteParams>();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    selectedOrgaId,
    focus,
    viewMode,
    swapPhase,
    setFocusFromRoute,
    setViewModeFromRoute,
    setFocusFromRouteWithAnimation,
    isFocusTransitioning,
    isSwitchingOrga,
  } = useOrgaStore();

  // Track if this is a popstate (browser back/forward) navigation
  const isPopstateRef = useRef(false);
  // Track previous focus for animation direction
  const previousFocusRef = useRef<FocusTarget>(focus);
  // Track the last pathname we processed to detect actual URL changes
  const lastPathnameRef = useRef<string>(location.pathname);
  // Track if we're in the middle of updating the URL from focus
  const isUpdatingUrlRef = useRef(false);
  // Track if we just synced focus FROM URL (prevent reverse sync)
  const justSyncedFromUrlRef = useRef(false);

  // Listen for popstate events (browser back/forward)
  useEffect(() => {
    const handlePopstate = () => {
      isPopstateRef.current = true;
    };

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  // URL → Focus sync: Only runs when URL actually changes
  useEffect(() => {
    // Skip if not on an org route
    if (!params.orgaId) return;

    // Skip if we're the ones updating the URL
    if (isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      lastPathnameRef.current = location.pathname;
      return;
    }

    // Skip if a focus transition is already in progress (user-initiated animation)
    // This prevents double-rendering during click navigation
    if (isFocusTransitioning && !isPopstateRef.current) {
      return;
    }

    // Only sync if the pathname actually changed
    if (location.pathname === lastPathnameRef.current) {
      return;
    }

    // Update our tracking ref
    lastPathnameRef.current = location.pathname;

    // Parse current URL
    const parsed = parseRouteToFocus(params, location.pathname);
    if (!parsed) return;

    // Check if focus/viewMode need updating
    const focusNeedsUpdate = !focusEquals(focus, parsed.focus);
    const viewModeNeedsUpdate = viewMode !== parsed.viewMode;

    if (!focusNeedsUpdate && !viewModeNeedsUpdate) return;

    // Mark that we're syncing from URL to prevent Focus→URL from running
    justSyncedFromUrlRef.current = true;

    if (focusNeedsUpdate) {
      // Use animation for browser back/forward navigation
      if (isPopstateRef.current && !isFocusTransitioning) {
        const direction = getNavigationDirection(previousFocusRef.current, parsed.focus);
        setFocusFromRouteWithAnimation(parsed.focus, direction);
      } else {
        setFocusFromRoute(parsed.focus);
      }
      previousFocusRef.current = parsed.focus;
    }
    // Only sync viewMode from URL if no animation is in progress
    // (FocusContainer handles view mode toggle animation directly)
    if (viewModeNeedsUpdate && swapPhase === "idle") {
      setViewModeFromRoute(parsed.viewMode);
    }

    // Reset flags after a tick (allows React to complete the render cycle)
    requestAnimationFrame(() => {
      justSyncedFromUrlRef.current = false;
      isPopstateRef.current = false;
    });
  }, [
    params,
    location.pathname,
    focus,
    viewMode,
    swapPhase,
    setFocusFromRoute,
    setViewModeFromRoute,
    setFocusFromRouteWithAnimation,
    isFocusTransitioning,
  ]);

  // Focus → URL sync: Update URL when focus changes (user navigation)
  useEffect(() => {
    // Skip if we just synced focus FROM URL (prevent reverse sync loop)
    if (justSyncedFromUrlRef.current) return;

    // Skip if no org selected
    if (!selectedOrgaId) return;

    // Only sync if already on an org route
    if (!params.orgaId) return;

    // Skip during org switching (OrgaSelector handles navigation)
    if (isSwitchingOrga) return;

    // Delay URL update while focus transition animation is playing.
    // The URL will update once the animation completes and isFocusTransitioning becomes false.
    // This prevents React Router from unmounting/remounting the component tree mid-animation.
    if (isFocusTransitioning) return;

    // Build the expected URL for current state
    const expectedUrl = buildUrlFromFocus(selectedOrgaId, focus, viewMode);

    // Only update if different from current URL
    if (location.pathname !== expectedUrl) {
      // Mark that we're updating the URL so the URL→Focus sync skips
      isUpdatingUrlRef.current = true;
      // Push to history so browser back works for user navigation
      // Pass state to indicate this is a user-initiated navigation (not URL typed)
      void navigate(expectedUrl, { state: { fromFocus: true } });
      // Update tracking refs
      lastPathnameRef.current = expectedUrl;
      previousFocusRef.current = focus;
    }
  }, [
    selectedOrgaId,
    focus,
    viewMode,
    location.pathname,
    navigate,
    isSwitchingOrga,
    isFocusTransitioning,
    params.orgaId,
  ]);
}
