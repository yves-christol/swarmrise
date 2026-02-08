import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useOrgaStore } from "../tools/orgaStore";
import { routes } from "./index";
import App from "../components/App";

const YOU_COME_FIRST_KEY = "swarmrise_you_come_first";

/**
 * Route component for /o/:orgaId (index route).
 * Implements "You come first" behavior: redirects to user's member view
 * if they have a member in this org (unless disabled via preference).
 */
export const OrgaIndexRoute = () => {
  const { selectedOrgaId, myMember } = useOrgaStore();
  const [shouldRedirect, setShouldRedirect] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if "You come first" is enabled (default: true)
    const stored = localStorage.getItem(YOU_COME_FIRST_KEY);
    const isEnabled = stored === null ? true : stored === "true";

    // If enabled and we have myMember, redirect
    if (isEnabled && myMember && selectedOrgaId) {
      setShouldRedirect(true);
    } else if (myMember !== undefined) {
      // myMember loaded (either exists or null), don't redirect
      setShouldRedirect(false);
    }
    // If myMember is undefined, still loading - wait
  }, [myMember, selectedOrgaId]);

  // Still determining whether to redirect
  if (shouldRedirect === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-current border-t-transparent" />
      </div>
    );
  }

  // Redirect to member view
  if (shouldRedirect && selectedOrgaId && myMember) {
    return <Navigate to={routes.member(selectedOrgaId, myMember._id)} replace />;
  }

  // Stay on org view
  return <App />;
};

/**
 * Toggle the "You come first" preference.
 * Returns the new value.
 */
export function toggleYouComeFirst(): boolean {
  const current = localStorage.getItem(YOU_COME_FIRST_KEY);
  const isCurrentlyEnabled = current === null ? true : current === "true";
  const newValue = !isCurrentlyEnabled;
  localStorage.setItem(YOU_COME_FIRST_KEY, String(newValue));
  return newValue;
}

/**
 * Get the current "You come first" preference.
 */
export function getYouComeFirstPreference(): boolean {
  const stored = localStorage.getItem(YOU_COME_FIRST_KEY);
  return stored === null ? true : stored === "true";
}
