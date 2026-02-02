"use client";

import { useEffect, useState } from "react";
import { useFocus } from "../../tools/orgaStore";
import { OrgNetworkDiagram } from "../OrgNetworkDiagram";
import { TeamRolesCircle } from "../TeamRolesCircle";
import { Id } from "../../../convex/_generated/dataModel";

type FocusContainerProps = {
  orgaId: Id<"orgas">;
};

const TRANSITION_DURATION = 400; // ms

export function FocusContainer({ orgaId }: FocusContainerProps) {
  const { focus, focusOnOrga, isFocusTransitioning, transitionOrigin, transitionDirection, onTransitionEnd } = useFocus();

  // Track which view to show during transition
  const [showTeamView, setShowTeamView] = useState(focus.type === "team");
  const [animationPhase, setAnimationPhase] = useState<"idle" | "zoom-out-old" | "zoom-in-new">("idle");

  // Handle view transitions
  useEffect(() => {
    if (!isFocusTransitioning) {
      setAnimationPhase("idle");
      setShowTeamView(focus.type === "team");
      return;
    }

    if (transitionDirection === "in") {
      // Zooming into team: first zoom out old view, then show new view
      setAnimationPhase("zoom-out-old");
      const timer1 = setTimeout(() => {
        setShowTeamView(true);
        setAnimationPhase("zoom-in-new");
      }, TRANSITION_DURATION / 2);

      const timer2 = setTimeout(() => {
        onTransitionEnd();
      }, TRANSITION_DURATION);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } else if (transitionDirection === "out") {
      // Zooming out to orga: first zoom out old view, then show new view
      setAnimationPhase("zoom-out-old");
      const timer1 = setTimeout(() => {
        setShowTeamView(false);
        setAnimationPhase("zoom-in-new");
      }, TRANSITION_DURATION / 2);

      const timer2 = setTimeout(() => {
        onTransitionEnd();
      }, TRANSITION_DURATION);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isFocusTransitioning, transitionDirection, focus.type, onTransitionEnd]);

  // Calculate transform origin based on transition origin
  const transformOrigin = transitionOrigin
    ? `${transitionOrigin.x}px ${transitionOrigin.y}px`
    : "center center";

  // Animation styles
  const getAnimationStyles = (): React.CSSProperties => {
    if (animationPhase === "idle") {
      return { opacity: 1, transform: "scale(1)" };
    }

    if (animationPhase === "zoom-out-old") {
      if (transitionDirection === "in") {
        // Zooming into team - scale up and fade out the org view
        return {
          opacity: 0,
          transform: "scale(1.5)",
          transformOrigin,
          transition: `all ${TRANSITION_DURATION / 2}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        };
      } else {
        // Zooming out to org - scale down and fade out the team view
        return {
          opacity: 0,
          transform: "scale(0.8)",
          transition: `all ${TRANSITION_DURATION / 2}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        };
      }
    }

    if (animationPhase === "zoom-in-new") {
      // New view fading in
      return {
        opacity: 1,
        transform: "scale(1)",
        animation: `fadeScaleIn ${TRANSITION_DURATION / 2}ms cubic-bezier(0.4, 0, 0.2, 1) forwards`,
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
        {showTeamView && focus.type === "team" ? (
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
