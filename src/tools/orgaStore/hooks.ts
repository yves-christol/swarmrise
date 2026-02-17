import { useContext } from "react";
import { OrgaStoreContext } from "./context";

export const useOrgaStore = () => {
  const context = useContext(OrgaStoreContext);
  if (!context) {
    throw new Error("useOrgaStore must be used within OrgaStoreProvider");
  }
  return context;
};

// Convenience hooks for common data needs

export const useSelectedOrga = () => {
  const { selectedOrga, selectedOrgaId, isLoading, isSwitchingOrga, myMember } = useOrgaStore();
  return { selectedOrga, selectedOrgaId, isLoading, isSwitchingOrga, myMember };
};

export const useOrgaList = () => {
  const { orgasWithCounts, isLoading, hasOrgas } = useOrgaStore();
  return { orgasWithCounts, isLoading, hasOrgas };
};

export const useFocus = () => {
  const {
    focus,
    focusOnTeam,
    focusOnRole,
    focusOnMember,
    focusOnTeamFromRole,
    focusOnRoleFromMember,
    focusOnTeamFromMember,
    focusOnOrgaFromMember,
    focusOnOrga,
    focusOnTeamFromNav,
    focusOnRoleFromNav,
    focusOnMemberFromNav,
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
  } = useOrgaStore();
  return {
    focus,
    focusOnTeam,
    focusOnRole,
    focusOnMember,
    focusOnTeamFromRole,
    focusOnRoleFromMember,
    focusOnTeamFromMember,
    focusOnOrgaFromMember,
    focusOnOrga,
    focusOnTeamFromNav,
    focusOnRoleFromNav,
    focusOnMemberFromNav,
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
  };
};

export const useViewMode = () => {
  const { viewMode, swapPhase, swapDirection, displayedMode, setViewMode } = useOrgaStore();
  return { viewMode, swapPhase, swapDirection, displayedMode, setViewMode };
};
