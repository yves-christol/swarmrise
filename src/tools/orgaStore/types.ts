import { Id } from "../../../convex/_generated/dataModel";
import type { Orga } from "../../../convex/orgas";
import type { Member } from "../../../convex/members";

export type { Orga };

// View mode types for switching between visual (SVG), manage (web), and kanban views
export type ViewMode = "visual" | "manage" | "kanban" | "policies";
export type SwapPhase = "idle" | "swapping-out" | "swapping-in";
export type SwapDirection = "up" | "down";

export type OrgaWithCounts = {
  orga: Orga;
  counts: {
    members: number;
    teams: number;
    roles: number;
  };
};

// Focus navigation types
export type FocusTarget =
  | { type: "orga" }
  | { type: "team"; teamId: Id<"teams"> }
  | { type: "role"; roleId: Id<"roles">; teamId: Id<"teams"> }
  | { type: "member"; memberId: Id<"members"> };

// Transition origin for zoom animations
export type TransitionOrigin = {
  x: number;
  y: number;
  radius: number;
} | null;

export type OrgaStoreContextType = {
  // Auth state
  isSignedIn: boolean;

  // Selection state
  selectedOrgaId: Id<"orgas"> | null;
  selectedOrga: Orga | null;
  selectOrga: (orgaId: Id<"orgas"> | null) => void;

  // Organization data
  orgasWithCounts: OrgaWithCounts[] | undefined;
  isLoading: boolean;
  hasOrgas: boolean;

  // Current user's member in the selected organization ("You come first")
  myMember: Member | null | undefined;

  // Transition state - true when switching between organizations
  isSwitchingOrga: boolean;
  // Internal: called by org-scoped hooks when they have finished loading
  _notifySwitchComplete: () => void;

  // Focus navigation state
  focus: FocusTarget;
  focusOnTeam: (teamId: Id<"teams">, origin?: TransitionOrigin) => void;
  focusOnRole: (roleId: Id<"roles">, teamId: Id<"teams">, origin?: TransitionOrigin) => void;
  focusOnMember: (memberId: Id<"members">, origin?: TransitionOrigin) => void;
  focusOnTeamFromRole: () => void;
  focusOnRoleFromMember: () => void;
  focusOnTeamFromMember: (teamId: Id<"teams">) => void;
  focusOnOrgaFromMember: () => void;
  focusOnOrga: () => void;
  focusOnTeamFromNav: (teamId: Id<"teams">) => void;
  focusOnRoleFromNav: (roleId: Id<"roles">, teamId: Id<"teams">) => void;
  focusOnMemberFromNav: (memberId: Id<"members">) => void;
  isFocusTransitioning: boolean;
  transitionOrigin: TransitionOrigin;
  transitionDirection: "in" | "out" | null;
  onTransitionEnd: () => void;
  // Team to center on when returning from team view
  returnFromTeamId: Id<"teams"> | null;
  clearReturnFromTeamId: () => void;
  // Role to highlight when returning from role view
  returnFromRoleId: Id<"roles"> | null;
  clearReturnFromRoleId: () => void;
  // Member to highlight when returning from member view
  returnFromMemberId: Id<"members"> | null;
  clearReturnFromMemberId: () => void;
  // Store previous focus for back navigation from member view
  previousFocusFromMember: { type: "role"; roleId: Id<"roles">; teamId: Id<"teams"> } | null;

  // View mode state (visual vs manage)
  viewMode: ViewMode;
  swapPhase: SwapPhase;
  swapDirection: SwapDirection;
  displayedMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Route-driven focus (for URL sync, no animation)
  setFocusFromRoute: (focus: FocusTarget) => void;
  setViewModeFromRoute: (mode: ViewMode) => void;

  // Route-driven focus with animation (for browser back/forward)
  setFocusFromRouteWithAnimation: (focus: FocusTarget, direction: "in" | "out") => void;
};
