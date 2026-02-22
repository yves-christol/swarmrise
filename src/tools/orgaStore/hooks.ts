import { useContext } from "react";
import { SelectionContext, FocusContext, ViewModeContext } from "./context";

// Full store hook (combines all 3 contexts for backward compatibility)
export const useOrgaStore = () => {
  const selection = useContext(SelectionContext);
  const focus = useContext(FocusContext);
  const viewMode = useContext(ViewModeContext);
  if (!selection || !focus || !viewMode) {
    throw new Error("useOrgaStore must be used within OrgaStoreProvider");
  }
  return { ...selection, ...focus, ...viewMode };
};

// Convenience hooks - each reads from its specific context only,
// so components only re-render when their relevant slice changes.

export const useSelectedOrga = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelectedOrga must be used within OrgaStoreProvider");
  const { selectedOrga, selectedOrgaId, isLoading, isSwitchingOrga, myMember } = ctx;
  return { selectedOrga, selectedOrgaId, isLoading, isSwitchingOrga, myMember };
};

export const useOrgaList = () => {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useOrgaList must be used within OrgaStoreProvider");
  const { orgasWithCounts, isLoading, hasOrgas } = ctx;
  return { orgasWithCounts, isLoading, hasOrgas };
};

export const useFocus = () => {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error("useFocus must be used within OrgaStoreProvider");
  return ctx;
};

export const useViewMode = () => {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode must be used within OrgaStoreProvider");
  return ctx;
};
