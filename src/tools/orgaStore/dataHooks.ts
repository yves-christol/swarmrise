import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import type { Member } from "../../../convex/members";
import type { Team } from "../../../convex/teams";
import type { Role } from "../../../convex/roles";
import { useOrgaStore } from "./hooks";

/**
 * Create an org-scoped query hook that properly handles switching state.
 * Returns undefined during org transitions to prevent stale data display.
 * Also notifies the store when switching is complete.
 */
const useOrgaScopedQuery = <T,>(
  queryResult: T | undefined,
  orgaIdUsedForQuery: Id<"orgas"> | null
): { data: T | undefined; isLoading: boolean } => {
  const { selectedOrgaId, isSwitchingOrga, _notifySwitchComplete } = useOrgaStore();
  const previousOrgaIdRef = useRef<Id<"orgas"> | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Detect when orgaId changes
  useEffect(() => {
    if (previousOrgaIdRef.current !== null && previousOrgaIdRef.current !== selectedOrgaId) {
      setIsTransitioning(true);
    }
    previousOrgaIdRef.current = selectedOrgaId;
  }, [selectedOrgaId]);

  // Clear transitioning when new data arrives for the current org
  useEffect(() => {
    if (
      queryResult !== undefined &&
      orgaIdUsedForQuery === selectedOrgaId &&
      isTransitioning
    ) {
      setIsTransitioning(false);
      // Also notify the store that switching is complete
      if (isSwitchingOrga) {
        _notifySwitchComplete();
      }
    }
  }, [queryResult, orgaIdUsedForQuery, selectedOrgaId, isTransitioning, isSwitchingOrga, _notifySwitchComplete]);

  // During transition, return undefined to show loading state
  const isLoading = queryResult === undefined || isTransitioning;
  const data = isTransitioning ? undefined : queryResult;

  return { data, isLoading };
};

export const useMembers = (): { data: Member[] | undefined; isLoading: boolean } => {
  const { selectedOrgaId, selectedOrga, isSignedIn } = useOrgaStore();
  // Only query if selectedOrga exists (validated against orgasWithCounts), not just selectedOrgaId (may be stale from localStorage)
  const members = useQuery(
    api.members.functions.listMembers,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );
  return useOrgaScopedQuery(members, selectedOrgaId);
};

export const useTeams = (): { data: Team[] | undefined; isLoading: boolean } => {
  const { selectedOrgaId, selectedOrga, isSignedIn } = useOrgaStore();
  // Only query if selectedOrga exists (validated against orgasWithCounts), not just selectedOrgaId (may be stale from localStorage)
  const teams = useQuery(
    api.teams.functions.listTeamsInOrga,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );
  return useOrgaScopedQuery(teams, selectedOrgaId);
};

export const useRoles = (): { data: Role[] | undefined; isLoading: boolean } => {
  const { selectedOrgaId, selectedOrga, isSignedIn } = useOrgaStore();
  // Only query if selectedOrga exists (validated against orgasWithCounts), not just selectedOrgaId (may be stale from localStorage)
  const roles = useQuery(
    api.roles.functions.listRolesInOrga,
    isSignedIn && selectedOrga ? { orgaId: selectedOrgaId! } : "skip"
  );
  return useOrgaScopedQuery(roles, selectedOrgaId);
};
