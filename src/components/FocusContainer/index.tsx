import { useEffect, useLayoutEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import { useFocus, useViewMode } from "../../tools/orgaStore";
import { useRouteSync } from "../../hooks/useRouteSync";
import { useViewModeNavigation } from "../../hooks/useViewModeNavigation";
import "./animations.css";
import { PrismFlip } from "../PrismFlip";

// Lazy-loaded view components - only one renders at a time
const OrgaVisualView = lazy(() => import("../OrgaVisualView").then(m => ({ default: m.OrgaVisualView })));
const TeamVisualView = lazy(() => import("../TeamVisualView").then(m => ({ default: m.TeamVisualView })));
const RoleVisualView = lazy(() => import("../RoleVisualView").then(m => ({ default: m.RoleVisualView })));
const MemberVisualView = lazy(() => import("../MemberVisualView").then(m => ({ default: m.MemberVisualView })));
const OrgaManageView = lazy(() => import("../OrgaManageView").then(m => ({ default: m.OrgaManageView })));
const RoleManageView = lazy(() => import("../RoleManageView").then(m => ({ default: m.RoleManageView })));
const TeamManageView = lazy(() => import("../TeamManageView").then(m => ({ default: m.TeamManageView })));
const MemberManageView = lazy(() => import("../MemberManageView").then(m => ({ default: m.MemberManageView })));
const KanbanBoard = lazy(() => import("../Kanban/KanbanBoard").then(m => ({ default: m.KanbanBoard })));
import { Id } from "../../../convex/_generated/dataModel";
import type { FocusTarget } from "../../tools/orgaStore/types";

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

// Snappy 300ms transition (macOS Mission Control feel)
const TRANSITION_DURATION = 300; // ms

// Spatial zoom transitions use proxy circle + simultaneous layers
const SPATIAL_TRANSITIONS = new Set<TransitionType>([
  "orga-to-team",
  "team-to-orga",
]);

function isSpatialTransition(type: TransitionType): boolean {
  return SPATIAL_TRANSITIONS.has(type);
}

export function FocusContainer({ orgaId }: FocusContainerProps) {
  const {
    focus,
    focusOnOrga,
    focusOnRole,
    focusOnMember,
    focusOnTeamFromRole,
    focusOnRoleFromMember,
    focusOnTeamFromMember,
    focusOnOrgaFromMember,
    isFocusTransitioning,
    transitionOrigin,
    transitionDirection,
    onTransitionEnd,
    previousFocusFromMember,
  } = useFocus();
  const { viewMode, swapPhase, displayedMode } = useViewMode();
  const { changeViewMode } = useViewModeNavigation();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync focus state with URL
  useRouteSync();

  // --- Transition state ---

  const [currentView, setCurrentView] = useState<ViewType>(focus.type);
  // For spatial transitions: the old view that is animating out
  const [exitingView, setExitingView] = useState<ViewType | null>(null);
  const [exitingFocus, setExitingFocus] = useState<FocusTarget | null>(null);

  const [animationPhase, setAnimationPhase] = useState<
    "idle" | "zoom-out-old" | "zoom-in-new" | "spatial-zoom"
  >("idle");

  const previousViewRef = useRef<ViewType>(focus.type);
  const previousFocusRef = useRef<FocusTarget>(focus);
  const [transitionType, setTransitionType] = useState<TransitionType>(null);

  // Proxy circle state
  type ProxyCircleState = {
    startX: number;
    startY: number;
    startRadius: number;
    endX: number;
    endY: number;
    endRadius: number;
  };
  const [proxyCircle, setProxyCircle] = useState<ProxyCircleState | null>(null);

  // Ref for the clip-path animated layer during spatial zoom
  const clipLayerRef = useRef<HTMLDivElement>(null);

  // Ref for OrgaVisualView's node position lookup
  const getNodeScreenPositionRef = useRef<
    ((teamId: string) => { x: number; y: number; radius: number } | null) | null
  >(null);

  const registerNodePositionLookup = useCallback(
    (lookup: (teamId: string) => { x: number; y: number; radius: number } | null) => {
      getNodeScreenPositionRef.current = lookup;
    },
    []
  );

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
      setExitingView(null);
      setExitingFocus(null);
      previousViewRef.current = focus.type;
      previousFocusRef.current = focus;
      setTransitionType(null);
      setProxyCircle(null);
      return;
    }

    const from = previousViewRef.current;
    const to = focus.type;
    const type = `${from}-to-${to}` as TransitionType;

    if (isSpatialTransition(type) && transitionOrigin !== null) {
      // === SPATIAL ZOOM TRANSITION ===
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerCenterX = containerRect.width / 2;
      const containerCenterY = containerRect.height / 2;
      const viewportDiagonal = Math.sqrt(
        containerRect.width * containerRect.width +
          containerRect.height * containerRect.height
      );
      const fullRadius = viewportDiagonal / 2;

      if (type === "orga-to-team") {
        // ZOOM IN: node expands to fill viewport
        const origin = transitionOrigin;
        const nodeX = origin ? origin.x : containerCenterX;
        const nodeY = origin ? origin.y : containerCenterY;
        const nodeRadius = origin ? origin.radius : 40;

        setProxyCircle({
          startX: nodeX,
          startY: nodeY,
          startRadius: nodeRadius,
          endX: containerCenterX,
          endY: containerCenterY,
          endRadius: fullRadius,
        });
      } else if (type === "team-to-orga") {
        // ZOOM OUT: viewport shrinks to viewport center.
        // The orga view centers on returnFromTeamId, so the team node
        // will end up at viewport center — contract the clip there.
        setProxyCircle({
          startX: containerCenterX,
          startY: containerCenterY,
          startRadius: fullRadius,
          endX: containerCenterX,
          endY: containerCenterY,
          endRadius: 40,
        });
      }

      // Store the exiting view info, then show the new view
      setExitingView(from);
      setExitingFocus(previousFocusRef.current);
      setCurrentView(to);
      setAnimationPhase("spatial-zoom");

      const timer = setTimeout(() => {
        previousViewRef.current = focus.type;
        previousFocusRef.current = focus;
        onTransitionEnd();
      }, TRANSITION_DURATION);

      return () => clearTimeout(timer);
    } else {
      // === NON-SPATIAL TRANSITION (two-phase scale) ===
      setAnimationPhase("zoom-out-old");

      const timer1 = setTimeout(() => {
        setCurrentView(focus.type);
        setAnimationPhase("zoom-in-new");
      }, TRANSITION_DURATION / 2);

      const timer2 = setTimeout(() => {
        previousViewRef.current = focus.type;
        previousFocusRef.current = focus;
        onTransitionEnd();
      }, TRANSITION_DURATION);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [isFocusTransitioning, transitionDirection, focus, onTransitionEnd, transitionOrigin]);

  // Transform origin CSS string from transition origin
  const transformOrigin = transitionOrigin
    ? `${transitionOrigin.x}px ${transitionOrigin.y}px`
    : "center center";

  // --- Non-spatial animation helpers ---

  const getZoomOutParams = (): { scale: number; origin: string } => {
    switch (transitionType) {
      case "team-to-role":
        return { scale: 1.8, origin: transformOrigin };
      case "role-to-team":
        return { scale: 0.4, origin: "center center" };
      case "orga-to-role":
        return { scale: 2, origin: transformOrigin };
      case "role-to-orga":
        return { scale: 0.3, origin: "center center" };
      case "role-to-member":
        return { scale: 1.6, origin: transformOrigin };
      case "member-to-role":
        return { scale: 0.4, origin: "center center" };
      case "member-to-team":
        return { scale: 0.4, origin: "center center" };
      case "member-to-orga":
        return { scale: 0.3, origin: "center center" };
      case "orga-to-member":
        return { scale: 2, origin: transformOrigin };
      case "team-to-member":
        return { scale: 1.5, origin: transformOrigin };
      default:
        return transitionDirection === "in"
          ? { scale: 2, origin: transformOrigin }
          : { scale: 0.4, origin: "center center" };
    }
  };

  const getZoomInAnimation = (): string => {
    switch (transitionType) {
      case "team-to-role":
      case "role-to-member":
      case "orga-to-member":
      case "orga-to-role":
      case "team-to-member":
        return "fadeScaleInFromSmall";
      case "role-to-team":
      case "member-to-role":
      case "member-to-team":
      case "member-to-orga":
      case "role-to-orga":
        return "fadeScaleInFromLarge";
      default:
        return "fadeScaleIn";
    }
  };

  const getNonSpatialStyles = (): React.CSSProperties => {
    if (animationPhase === "idle") {
      return { opacity: 1 };
    }
    if (animationPhase === "zoom-out-old") {
      const { scale, origin } = getZoomOutParams();
      return {
        opacity: 0,
        transform: `scale(${scale})`,
        transformOrigin: origin,
        transition: `all ${TRANSITION_DURATION / 2}ms cubic-bezier(0.2, 0, 0, 1)`,
      };
    }
    if (animationPhase === "zoom-in-new") {
      const animationName = getZoomInAnimation();
      return {
        opacity: 1,
        transform: "scale(1)",
        animation: `${animationName} ${TRANSITION_DURATION / 2}ms cubic-bezier(0.2, 0, 0, 1) forwards`,
      };
    }
    return {};
  };

  const getFlipClass = (): string => {
    if (viewMode === "kanban" && focus.type === "team") return "kanban";
    if (viewMode === "manage") return "manage";
    return "visual";
  };

  const isTeamFocused = focus.type === "team";

  // Keyboard shortcut for view toggle (V key cycles modes, K jumps to kanban)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (isFocusTransitioning || animationPhase !== "idle") {
        return;
      }
      if (e.key === "v" || e.key === "V") {
        if (isTeamFocused) {
          // Cycle: visual -> manage -> kanban -> visual
          const next = viewMode === "visual" ? "manage" : viewMode === "manage" ? "kanban" : "visual";
          changeViewMode(next);
        } else {
          changeViewMode(viewMode === "visual" ? "manage" : "visual");
        }
      }
      if ((e.key === "k" || e.key === "K") && isTeamFocused) {
        changeViewMode("kanban");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewMode, changeViewMode, isFocusTransitioning, animationPhase, isTeamFocused]);

  // --- Render helper ---

  const renderView = (viewType: ViewType, focusTarget: FocusTarget, flipClass: string) => {
    if (viewType === "member" && focusTarget.type === "member") {
      return (
        <PrismFlip
          geometry="coin"
          activeFaceKey={flipClass}
          faces={[
            {
              key: "visual",
              content: (
                <MemberVisualView
                  memberId={focusTarget.memberId}
                  onZoomOut={
                    previousFocusFromMember
                      ? focusOnRoleFromMember
                      : focusOnOrgaFromMember
                  }
                  onNavigateToRole={(roleId, teamId) => focusOnRole(roleId, teamId)}
                  onNavigateToTeam={(teamId) => focusOnTeamFromMember(teamId)}
                />
              ),
            },
            {
              key: "manage",
              content: (
                <MemberManageView
                  memberId={focusTarget.memberId}
                  onZoomOut={
                    previousFocusFromMember
                      ? focusOnRoleFromMember
                      : focusOnOrgaFromMember
                  }
                />
              ),
            },
          ]}
        />
      );
    }

    if (viewType === "role" && focusTarget.type === "role") {
      return (
        <PrismFlip
          geometry="coin"
          activeFaceKey={flipClass}
          faces={[
            {
              key: "visual",
              content: (
                <RoleVisualView
                  roleId={focusTarget.roleId}
                  onZoomOut={focusOnTeamFromRole}
                  onNavigateToRole={(roleId, teamId) => focusOnRole(roleId, teamId)}
                  onNavigateToMember={(memberId, origin) =>
                    focusOnMember(memberId, origin)
                  }
                />
              ),
            },
            {
              key: "manage",
              content: (
                <RoleManageView
                  roleId={focusTarget.roleId}
                  onZoomOut={focusOnTeamFromRole}
                />
              ),
            },
          ]}
        />
      );
    }

    if (viewType === "team" && focusTarget.type === "team") {
      return (
        <PrismFlip
          geometry="prism"
          activeFaceKey={flipClass}
          faces={[
            {
              key: "visual",
              content: (
                <TeamVisualView
                  teamId={focusTarget.teamId}
                  onZoomOut={focusOnOrga}
                />
              ),
            },
            {
              key: "manage",
              content: (
                <TeamManageView
                  teamId={focusTarget.teamId}
                  onZoomOut={focusOnOrga}
                />
              ),
            },
            {
              key: "kanban",
              content: (
                <div className="absolute inset-0 overflow-auto p-4">
                  <KanbanBoard teamId={focusTarget.teamId} orgaId={orgaId} />
                </div>
              ),
            },
          ]}
        />
      );
    }

    // Default: orga view
    return (
      <PrismFlip
        geometry="coin"
        activeFaceKey={flipClass}
        faces={[
          {
            key: "visual",
            content: (
              <OrgaVisualView
                orgaId={orgaId}
                onRegisterNodePositionLookup={registerNodePositionLookup}
              />
            ),
          },
          {
            key: "manage",
            content: <OrgaManageView orgaId={orgaId} />,
          },
        ]}
      />
    );
  };

  // --- Clip-path animation for spatial zoom (FLIP technique) ---

  useLayoutEffect(() => {
    if (animationPhase !== "spatial-zoom" || !clipLayerRef.current || !proxyCircle) return;

    const el = clipLayerRef.current;
    const { startX, startY, startRadius, endX, endY, endRadius } = proxyCircle;

    // Set initial clip-path (before paint)
    el.style.clipPath = `circle(${startRadius}px at ${startX}px ${startY}px)`;
    el.style.transition = "none";

    // Force reflow so browser registers the start state
    el.getBoundingClientRect();

    // Animate to end state
    el.style.transition = `clip-path ${TRANSITION_DURATION}ms cubic-bezier(0.2, 0, 0, 1)`;
    el.style.clipPath = `circle(${endRadius}px at ${endX}px ${endY}px)`;

    // Cleanup: remove inline clip-path when transition ends or deps change
    return () => {
      el.style.clipPath = "";
      el.style.transition = "";
    };
  }, [animationPhase, proxyCircle]);

  // --- Main render ---

  const isSpatial = isSpatialTransition(transitionType);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden z-0">
      {/* ========== MAIN VIEW (always rendered here, persists after transitions) ========== */}
      <div
        ref={isSpatial && animationPhase === "spatial-zoom" && transitionType === "orga-to-team" ? clipLayerRef : undefined}
        className="focus-view absolute inset-0"
        style={isSpatial && animationPhase === "spatial-zoom" ? undefined : getNonSpatialStyles()}
      >
        <Suspense fallback={null}>
          {renderView(currentView, focus, getFlipClass())}
        </Suspense>
      </div>

      {/* ========== EXITING OVERLAY (spatial zoom only, removed when transition ends) ========== */}
      {isSpatial && animationPhase === "spatial-zoom" && exitingView !== null && exitingFocus !== null && (
        transitionType === "orga-to-team" ? (
          /* Old orga view fading/scaling — sits on top, reveals clipped team view as it fades */
          <div
            className="zoom-layer-old zoom-in-exit"
            style={{ transformOrigin }}
          >
            <Suspense fallback={null}>
              {renderView(exitingView, exitingFocus, getFlipClass())}
            </Suspense>
          </div>
        ) : transitionType === "team-to-orga" ? (
          /* Old team view contracting via clip-path — sits on top of the orga view */
          <div ref={clipLayerRef} className="zoom-layer-old">
            <Suspense fallback={null}>
              {renderView(exitingView, exitingFocus, getFlipClass())}
            </Suspense>
          </div>
        ) : null
      )}

      {/* Screen reader announcement for view mode */}
      <div role="status" aria-live="polite" className="sr-only">
        {swapPhase === "idle" &&
          (displayedMode === "kanban"
            ? "Now viewing Kanban board. Press V to cycle views."
            : displayedMode === "visual"
              ? "Now viewing visual diagram. Press V to switch to management view."
              : "Now viewing management options. Press V to switch to visual diagram.")}
      </div>
    </div>
  );
}
