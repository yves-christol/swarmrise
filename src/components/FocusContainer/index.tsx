"use client";

import { useEffect, useState, useRef } from "react";
import { useFocus } from "../../tools/orgaStore";
import { OrgNetworkDiagram } from "../OrgNetworkDiagram";
import { TeamRolesCircle } from "../TeamRolesCircle";
import { RoleFocusView } from "../RoleFocusView";
import { Id } from "../../../convex/_generated/dataModel";

type FocusContainerProps = {
  orgaId: Id<"orgas">;
};

type ViewType = "orga" | "team" | "role";
type TransitionType =
  | "orga-to-team"
  | "team-to-orga"
  | "team-to-role"
  | "role-to-team"
  | "orga-to-role"
  | "role-to-orga"
  | null;

const TRANSITION_DURATION = 400; // ms

export function FocusContainer({ orgaId }: FocusContainerProps) {
  const { focus, focusOnOrga, focusOnTeamFromRole, isFocusTransitioning, transitionOrigin, transitionDirection, onTransitionEnd } = useFocus();

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

        @media (prefers-reduced-motion: reduce) {
          .focus-view {
            animation: none !important;
            transition: opacity 150ms ease-out !important;
            transform: none !important;
          }
        }
      `}</style>

      {/* View container with transitions */}
      <div
        className="focus-view absolute inset-0"
        style={getAnimationStyles()}
      >
        {currentView === "role" && focus.type === "role" ? (
          <RoleFocusView
            roleId={focus.roleId}
            onZoomOut={focusOnTeamFromRole}
          />
        ) : currentView === "team" && focus.type === "team" ? (
          <TeamRolesCircle
            teamId={focus.teamId}
            onZoomOut={focusOnOrga}
          />
        ) : (
          <OrgNetworkDiagram orgaId={orgaId} />
        )}
      </div>
    </div>
  );
}
