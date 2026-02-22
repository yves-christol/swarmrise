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

// --- Split context types for render optimization ---

export type SelectionContextType = {
  isSignedIn: boolean;
  selectedOrgaId: Id<"orgas"> | null;
  selectedOrga: Orga | null;
  selectOrga: (orgaId: Id<"orgas"> | null) => void;
  orgasWithCounts: OrgaWithCounts[] | undefined;
  isLoading: boolean;
  hasOrgas: boolean;
  myMember: Member | null | undefined;
  isSwitchingOrga: boolean;
  _notifySwitchComplete: () => void;
};

export type FocusContextType = {
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
  returnFromTeamId: Id<"teams"> | null;
  clearReturnFromTeamId: () => void;
  returnFromRoleId: Id<"roles"> | null;
  clearReturnFromRoleId: () => void;
  returnFromMemberId: Id<"members"> | null;
  clearReturnFromMemberId: () => void;
  previousFocusFromMember: { type: "role"; roleId: Id<"roles">; teamId: Id<"teams"> } | null;
  setFocusFromRoute: (focus: FocusTarget) => void;
  setFocusFromRouteWithAnimation: (focus: FocusTarget, direction: "in" | "out") => void;
};

export type ViewModeContextType = {
  viewMode: ViewMode;
  swapPhase: SwapPhase;
  swapDirection: SwapDirection;
  displayedMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  setViewModeFromRoute: (mode: ViewMode) => void;
};

// Combined type for backward compatibility (useOrgaStore)
export type OrgaStoreContextType = SelectionContextType & FocusContextType & ViewModeContextType;
