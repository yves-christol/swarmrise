import {
  useRef,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import "./PrismFlip.css";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PrismGeometry = "coin" | "prism";

export type PrismFace = {
  key: string;
  content: ReactNode;
};

type PrismFlipProps = {
  faces: PrismFace[];
  activeFaceKey: string;
  geometry: PrismGeometry;
  /** Flip animation duration in ms (default 500) */
  duration?: number;
  /** Called when the flip animation fully completes */
  onFlipComplete?: () => void;
};

type FlipState =
  | { phase: "idle" }
  | { phase: "animating"; from: string };

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DURATION = 500;
const EASING = "cubic-bezier(0.2, 0.8, 0.3, 1)";

// Rotation angles per face index
const COIN_ANGLES = [0, 180];
const PRISM_ANGLES = [0, 120, 240];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Card (wrapper) transform: pulls camera back + rotates to show the target face. */
function computeCardTransform(
  faceKey: string,
  faceIndexMap: Map<string, number>,
  angles: number[],
  geometry: PrismGeometry,
  apothem: number
): string {
  const idx = faceIndexMap.get(faceKey) ?? 0;
  const angle = -(angles[idx] ?? 0);
  if (geometry === "prism") {
    return `translateZ(${-apothem}px) rotateY(${angle}deg)`;
  }
  return `rotateY(${angle}deg)`;
}

/** Individual face transform: positions the face on the prism/coin surface. */
function computeFaceTransform(
  index: number,
  angles: number[],
  geometry: PrismGeometry,
  apothem: number
): string {
  if (geometry === "prism") {
    return `rotateY(${angles[index]}deg) translateZ(${apothem}px)`;
  }
  return `rotateY(${angles[index]}deg)`;
}

// ---------------------------------------------------------------------------
// Component
//
// Architecture (no-reparenting, hybrid declarative/imperative):
//
// Face content is rendered as permanent React children — they never move
// in the DOM, so CSS/SVG drawing animations are never restarted.
//
// Face styles (visibility, transforms, backface-visibility) are DECLARATIVE
// — computed from flipState in JSX. This avoids conflicts between React's
// reconciler and imperative style overrides on re-render.
//
// Card rotation is IMPERATIVE (reflow trick in useLayoutEffect) because
// we need to snap to the FROM rotation and transition to TO in one commit.
//
// In idle state there is zero 3D context — flat DOM, full interactivity.
// During the ~500ms flip, perspective/preserve-3d/face-transforms activate,
// then get stripped.
// ---------------------------------------------------------------------------

export function PrismFlip({
  faces,
  activeFaceKey,
  geometry,
  duration = DEFAULT_DURATION,
  onFlipComplete,
}: PrismFlipProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [flipState, setFlipState] = useState<FlipState>({ phase: "idle" });
  const prevActiveKeyRef = useRef(activeFaceKey);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Stable ref for callback — prevents effect re-runs when identity changes
  const onFlipCompleteRef = useRef(onFlipComplete);
  onFlipCompleteRef.current = onFlipComplete;

  // Detect prefers-reduced-motion — skip 3D animation entirely
  const prefersReducedMotion = useRef(false);
  useLayoutEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion.current = mql.matches;
    const handler = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Apothem for prism geometry (computed from container width)
  const [apothem, setApothem] = useState(300);

  const angles = geometry === "prism" ? PRISM_ANGLES : COIN_ANGLES;

  // Build a key→index map (stable ref, rebuilt each render)
  const faceIndexMap = useRef(new Map<string, number>());
  faceIndexMap.current.clear();
  faces.forEach((f, i) => faceIndexMap.current.set(f.key, i));

  // -------------------------------------------------------------------
  // Apothem calculation (prism geometry only)
  // -------------------------------------------------------------------

  useLayoutEffect(() => {
    if (geometry !== "prism") return;
    const el = rootRef.current;
    if (!el) return;

    const update = () => {
      const width = el.getBoundingClientRect().width;
      setApothem(width / (2 * Math.tan(Math.PI / 3)));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [geometry]);

  // -------------------------------------------------------------------
  // State machine
  // -------------------------------------------------------------------

  // Detect activeFaceKey change → start animation
  useLayoutEffect(() => {
    const prevKey = prevActiveKeyRef.current;
    if (prevKey === activeFaceKey) return;

    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    prevActiveKeyRef.current = activeFaceKey;

    if (prefersReducedMotion.current) {
      setFlipState({ phase: "idle" });
      onFlipCompleteRef.current?.();
      return;
    }

    setFlipState({ phase: "animating", from: prevKey });
  }, [activeFaceKey]);

  // Idle: clear card's imperative transform/transition
  useLayoutEffect(() => {
    if (flipState.phase !== "idle") return;
    const card = cardRef.current;
    if (!card) return;
    card.style.transition = "none";
    card.style.transform = "";
  }, [flipState]);

  // Animation: imperative card rotation via reflow trick.
  // Deps intentionally exclude `faces` and `onFlipComplete` (accessed
  // via refs) so parent re-renders don't restart the animation.
  useLayoutEffect(() => {
    if (flipState.phase !== "animating") return;
    const card = cardRef.current;
    if (!card) return;

    const { from } = flipState;
    const to = activeFaceKey;

    // 1. Snap card to the FROM rotation (no transition)
    card.style.transition = "none";
    card.style.transform = computeCardTransform(
      from,
      faceIndexMap.current,
      angles,
      geometry,
      apothem
    );

    // 2. Force reflow — browser registers the start position
    card.getBoundingClientRect();

    // 3. Enable transition and set TO rotation — animation begins
    card.style.transition = `transform ${duration}ms ${EASING}`;
    card.style.transform = computeCardTransform(
      to,
      faceIndexMap.current,
      angles,
      geometry,
      apothem
    );

    // 4. After duration, return to idle
    animationTimerRef.current = setTimeout(() => {
      setFlipState({ phase: "idle" });
      onFlipCompleteRef.current?.();
    }, duration);

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
    };
  }, [flipState, activeFaceKey, angles, geometry, apothem, duration]);

  // -------------------------------------------------------------------
  // Render — fully declarative face styles driven by flipState.
  // Card transform/transition are the only imperative pieces.
  // -------------------------------------------------------------------

  const isAnimating = flipState.phase === "animating";
  const fromKey = isAnimating ? flipState.from : null;

  return (
    <div
      ref={rootRef}
      className="prism-flip-root"
      style={isAnimating ? { perspective: "1200px" } : undefined}
    >
      <div
        ref={cardRef}
        className="prism-flip-card"
        style={isAnimating ? { transformStyle: "preserve-3d" } : undefined}
      >
        {faces.map((face) => {
          const isActive = face.key === activeFaceKey;
          const isFrom = face.key === fromKey;
          const isParticipating = isActive || isFrom;
          const isVisible = isAnimating ? isParticipating : isActive;
          const idx = faceIndexMap.current.get(face.key) ?? 0;

          return (
            <div
              key={face.key}
              className="prism-flip-face"
              style={{
                visibility: isVisible ? "visible" : "hidden",
                pointerEvents: !isAnimating && isActive ? "auto" : "none",
                ...(isAnimating && isParticipating
                  ? {
                      backfaceVisibility: "hidden",
                      transform: computeFaceTransform(idx, angles, geometry, apothem),
                    }
                  : {}),
              }}
            >
              {face.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
