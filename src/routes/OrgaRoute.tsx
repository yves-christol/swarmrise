import { useEffect, useState } from "react";
import { useParams, Navigate, Outlet } from "react-router";
import { Id } from "../../convex/_generated/dataModel";
import { useOrgaStore } from "../tools/orgaStore";

type OrgaRouteState = "loading" | "validating" | "switching" | "invalid" | "ready";

export const OrgaRoute = () => {
  const { orgaId: urlOrgaId } = useParams<{ orgaId: string }>();
  const {
    orgasWithCounts,
    isLoading,
    selectedOrgaId,
    selectOrga,
    isSwitchingOrga,
  } = useOrgaStore();

  const [state, setState] = useState<OrgaRouteState>("loading");

  useEffect(() => {
    // Still loading orgs data
    if (isLoading || orgasWithCounts === undefined) {
      setState("loading");
      return;
    }

    // No URL orgaId provided
    if (!urlOrgaId) {
      setState("invalid");
      return;
    }

    // Cast to Id type for comparison
    const typedOrgaId = urlOrgaId as Id<"orgas">;

    // Check if user has access to this org
    const hasAccess = orgasWithCounts.some((o) => o.orga._id === typedOrgaId);
    if (!hasAccess) {
      setState("invalid");
      return;
    }

    // URL org differs from selected - sync OrgaStore to URL
    if (selectedOrgaId !== typedOrgaId) {
      setState("validating");
      selectOrga(typedOrgaId);
      return;
    }

    // Currently switching orgs
    if (isSwitchingOrga) {
      setState("switching");
      return;
    }

    // All good
    setState("ready");
  }, [isLoading, orgasWithCounts, urlOrgaId, selectedOrgaId, selectOrga, isSwitchingOrga]);

  // Redirect to home if invalid
  if (state === "invalid") {
    return <Navigate to="/" replace />;
  }

  // Show spinner for loading states
  if (state === "loading" || state === "validating" || state === "switching") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent" />
      </div>
    );
  }

  // Ready - render child routes
  return <Outlet />;
};
