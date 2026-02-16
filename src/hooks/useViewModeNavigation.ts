import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { useOrgaStore } from "../tools/orgaStore";
import { buildUrlFromFocus } from "./useRouteSync";
import type { ViewMode } from "../tools/orgaStore/types";

export function useViewModeNavigation() {
  const { selectedOrgaId, focus, viewMode, setViewMode } = useOrgaStore();
  const location = useLocation();
  const navigate = useNavigate();

  const changeViewMode = useCallback(
    (newMode: ViewMode) => {
      if (!selectedOrgaId) return;
      const newPath = buildUrlFromFocus(selectedOrgaId, focus, newMode);
      if (location.pathname !== newPath) {
        void navigate(newPath, { replace: true });
      }
      setViewMode(newMode);
    },
    [selectedOrgaId, focus, location.pathname, navigate, setViewMode]
  );

  return { viewMode, changeViewMode };
}
