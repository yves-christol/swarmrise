"use client";

import { useEffect, useState, useRef } from "react";
import { useFocus, useViewMode } from "../../tools/orgaStore";
import { OrgNetworkDiagram } from "../OrgNetworkDiagram";
import { TeamRolesCircle } from "../TeamRolesCircle";
import { RoleFocusView } from "../RoleFocusView";
import { MemberFocusView } from "../MemberFocusView";
import { OrgaManageView } from "../OrgaManageView";
import { RoleManageView } from "../RoleManageView";
import { ViewToggle } from "../ViewToggle";
import { Id } from "../../../convex/_generated/dataModel";

type FocusContainerProps = {
  orgaId: Id<"orgas">;
};

type ViewType = "orga" | "team" | "role" | "member";
type TransitionType =
  | "orga-to-team"
  | "team-to-orga"
  | "team-to-role"
  | "role-to-team"
  | "orga-to-role"
  | "role-to-orga"
  | "orga-to-member"
  | "member-to-orga"
  | "role-to-member"
  | "member-to-role"
  | "member-to-team"
  | "team-to-member"
  | null;

const TRANSITION_DURATION = 400; // ms

export function FocusContainer({ orgaId }: FocusContainerProps) {
  const { focus, focusOnOrga, focusOnRole, focusOnMember, focusOnTeamFromRole, focusOnRoleFromMember, focusOnTeamFromMember, focusOnOrgaFromMember, isFocusTransitioning, transitionOrigin, transitionDirection, onTransitionEnd, previousFocusFromMember } = useFocus();
  const { viewMode, swapPhase, swapDirection, displayedMode, setViewMode } = useViewMode();

  // Track which view to show during transition
  const [currentView, setCurrentView] = useState<ViewType>(focus.type);
  const [animationPhase, setAnimationPhase] = useState<"idle" | "zoom-out-old" | "zoom-in-new">("idle");

  // Track previous view for determining transition type
  const previousViewRef = useRef<ViewType>(focus.type);
  const [transitionType, setTransitionType] = useState<TransitionType>(null);

  // Determine transition type when focus changes
  useEffect(() => {
    if (isFocusTransitioning && previousViewRef.current !== focus.type) {
      const from = previousViewRef.current;
      const to = focus.type;
      setTransitionType(`${from}-to-${to}` as TransitionType);
    }
  }, [isFocusTransitioning, focus.type]);

  // Handle view transitions
  useEffect(() => {
    if (!isFocusTransitioning) {
      setAnimationPhase("idle");
      setCurrentView(focus.type);
      previousViewRef.current = focus.type;
      setTransitionType(null);
      return;
    }

    // Start transition animation
    setAnimationPhase("zoom-out-old");

    const timer1 = setTimeout(() => {
      setCurrentView(focus.type);
      setAnimationPhase("zoom-in-new");
    }, TRANSITION_DURATION / 2);

    const timer2 = setTimeout(() => {
      previousViewRef.current = focus.type;
      onTransitionEnd();
    }, TRANSITION_DURATION);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isFocusTransitioning, transitionDirection, focus.type, onTransitionEnd]);

  // Calculate transform origin based on transition origin
  const transformOrigin = transitionOrigin
    ? `${transitionOrigin.x}px ${transitionOrigin.y}px`
    : "center center";

  // Get animation parameters based on transition type
  const getZoomOutParams = (): { scale: number; origin: string } => {
    switch (transitionType) {
      case "orga-to-team":
        // Zooming into a team from org view
        return { scale: 1.5, origin: transformOrigin };
      case "team-to-role":
        // Zooming into a role from team view
        return { scale: 1.8, origin: transformOrigin };
      case "team-to-orga":
        // Zooming out from team to org
        return { scale: 0.7, origin: "center center" };
      case "role-to-team":
        // Zooming out from role to team
        return { scale: 0.6, origin: "center center" };
      case "orga-to-role":
        // Direct jump to role (rare)
        return { scale: 2, origin: transformOrigin };
      case "role-to-orga":
        // Direct jump from role to org (rare)
        return { scale: 0.5, origin: "center center" };
      case "role-to-member":
        // Zooming into member from role view
        return { scale: 1.6, origin: transformOrigin };
      case "member-to-role":
        // Zooming out from member to role
        return { scale: 0.6, origin: "center center" };
      case "member-to-team":
        // Zooming out from member to team
        return { scale: 0.7, origin: "center center" };
      case "member-to-orga":
        // Zooming out from member to org (when started on member via "You come first")
        return { scale: 0.5, origin: "center center" };
      case "orga-to-member":
        // Zooming into member from org view (direct)
        return { scale: 2, origin: transformOrigin };
      case "team-to-member":
        // Zooming into member from team view (rare)
        return { scale: 1.5, origin: transformOrigin };
      default:
        // Fallback based on direction
        return transitionDirection === "in"
          ? { scale: 1.5, origin: transformOrigin }
          : { scale: 0.8, origin: "center center" };
    }
  };

  // Get the animation name for zoom-in based on transition type
  const getZoomInAnimation = (): string => {
    switch (transitionType) {
      case "team-to-role":
        return "fadeScaleInFromSmall";
      case "role-to-team":
        return "fadeScaleInFromLarge";
      case "orga-to-team":
        return "fadeScaleInFromSmall";
      case "team-to-orga":
        return "fadeScaleInFromLarge";
      case "role-to-member":
        return "fadeScaleInFromSmall";
      case "member-to-role":
        return "fadeScaleInFromLarge";
      case "member-to-team":
        return "fadeScaleInFromLarge";
      case "member-to-orga":
        return "fadeScaleInFromLarge";
      case "orga-to-member":
        return "fadeScaleInFromSmall";
      case "team-to-member":
        return "fadeScaleInFromSmall";
      default:
        return "fadeScaleIn";
    }
  };

  // Animation styles
  const getAnimationStyles = (): React.CSSProperties => {
    if (animationPhase === "idle") {
      return { opacity: 1, transform: "scale(1)" };
    }

    if (animationPhase === "zoom-out-old") {
      const { scale, origin } = getZoomOutParams();
      return {
        opacity: 0,
        transform: `scale(${scale})`,
        transformOrigin: origin,
        transition: `all ${TRANSITION_DURATION / 2}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      };
    }

    if (animationPhase === "zoom-in-new") {
      const animationName = getZoomInAnimation();
      return {
        opacity: 1,
        transform: "scale(1)",
        animation: `${animationName} ${TRANSITION_DURATION / 2}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
      };
    }

    return {};
  };

  // Get swap animation class for view mode transitions
  const getSwapClass = (): string => {
    if (swapPhase === "idle") return "";
    if (swapPhase === "swapping-out") {
      return swapDirection === "up" ? "swap-out-up" : "swap-out-down";
    }
    return swapDirection === "up" ? "swap-in-up" : "swap-in-down";
  };

  // Keyboard shortcut for view toggle (V key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      // Don't handle during focus transitions
      if (isFocusTransitioning || animationPhase !== "idle") {
        return;
      }

      if (e.key === "v" || e.key === "V") {
        setViewMode(viewMode === "visual" ? "manage" : "visual");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, setViewMode, isFocusTransitioning, animationPhase]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* CSS for animations */}
      <style>{`
        @keyframes fadeScaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeScaleInFromSmall {
          from {
            opacity: 0;
            transform: scale(0.6);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeScaleInFromLarge {
          from {
            opacity: 0;
            transform: scale(1.3);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* View mode swap animations */
        @keyframes swapOutUp {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-24px) scale(0.98);
          }
        }

        @keyframes swapInUp {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes swapOutDown {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
        }

        @keyframes swapInDown {
          from {
            opacity: 0;
            transform: translateY(-24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .swap-out-up {
          animation: swapOutUp 175ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .swap-in-up {
          animation: swapInUp 175ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .swap-out-down {
          animation: swapOutDown 175ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        .swap-in-down {
          animation: swapInDown 175ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .focus-view {
            animation: none !important;
            transition: opacity 150ms ease-out !important;
            transform: none !important;
          }
          .swap-out-up, .swap-in-up, .swap-out-down, .swap-in-down {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* View toggle - show for orga and role views when not transitioning */}
      {animationPhase === "idle" && !isFocusTransitioning && (currentView === "orga" || currentView === "role") && (
        <ViewToggle
          mode={viewMode}
          onChange={setViewMode}
          disabled={swapPhase !== "idle"}
        />
      )}

      {/* View container with transitions */}
      <div
        className="focus-view absolute inset-0"
        style={getAnimationStyles()}
      >
        {currentView === "member" && focus.type === "member" ? (
          <MemberFocusView
            memberId={focus.memberId}
            onZoomOut={previousFocusFromMember ? focusOnRoleFromMember : focusOnOrgaFromMember}
            onNavigateToRole={(roleId, teamId) => focusOnRole(roleId, teamId)}
            onNavigateToTeam={(teamId) => focusOnTeamFromMember(teamId)}
          />
        ) : currentView === "role" && focus.type === "role" ? (
          /* Role view with swap animation between visual and manage */
          <div className={`absolute inset-0 ${getSwapClass()}`}>
            {displayedMode === "visual" ? (
              <RoleFocusView
                roleId={focus.roleId}
                onZoomOut={focusOnTeamFromRole}
                onNavigateToRole={(roleId, teamId) => focusOnRole(roleId, teamId)}
                onNavigateToMember={(memberId, origin) => focusOnMember(memberId, origin)}
              />
            ) : (
              <RoleManageView
                roleId={focus.roleId}
                onZoomOut={focusOnTeamFromRole}
              />
            )}
          </div>
        ) : currentView === "team" && focus.type === "team" ? (
          <TeamRolesCircle
            teamId={focus.teamId}
            onZoomOut={focusOnOrga}
          />
        ) : (
          /* Orga view with swap animation between visual and manage */
          <div className={`absolute inset-0 ${getSwapClass()}`}>
            {displayedMode === "visual" ? (
              <OrgNetworkDiagram orgaId={orgaId} />
            ) : (
              <OrgaManageView orgaId={orgaId} />
            )}
          </div>
        )}
      </div>

      {/* Screen reader announcement for view mode */}
      <div role="status" aria-live="polite" className="sr-only">
        {swapPhase === "idle" && (currentView === "orga" || currentView === "role") && (
          displayedMode === "visual"
            ? "Now viewing visual diagram. Press V to switch to management view."
            : "Now viewing management options. Press V to switch to visual diagram."
        )}
      </div>
    </div>
  );
}
