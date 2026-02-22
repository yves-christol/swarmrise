# Lottery Tool: Animation & Component Technical Specification

This document provides the complete technical specification for the Lottery Tool animation component. It is intended for the chat team to implement. For the animation design rationale, timing decisions, and testing checklist, see [ANIMATION.md](./ANIMATION.md) (section: "Lottery Tool (Chat Embedded)").

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Type Definitions](#type-definitions)
4. [Component Architecture](#component-architecture)
5. [State Machine](#state-machine)
6. [CSS Keyframes & Classes](#css-keyframes--classes)
7. [SVG Assets](#svg-assets)
8. [Shuffle Algorithm](#shuffle-algorithm)
9. [Integration with MessageItem](#integration-with-messageitem)
10. [Accessibility](#accessibility)
11. [Reduced Motion](#reduced-motion)
12. [Edge Cases](#edge-cases)
13. [Color & Theme Integration](#color--theme-integration)

---

## 1. Overview

The Lottery Tool is an embedded chat tool that randomly selects a member from a channel to assign them a task. It lives inside a chat message, just like VotingTool, TopicTool, and ElectionTool. The animation creates a brief "name roulette" moment -- shuffling through member avatars, decelerating, and revealing the winner with a celebratory pulse.

**Total animation duration**: ~2600ms (Shuffle 1200ms + Deceleration 800ms + Reveal 600ms)

**Dependencies**: None beyond React 19, Tailwind CSS v4, and Convex hooks (already in the project). No animation libraries.

---

## 2. File Structure

```
src/components/Chat/LotteryTool/
  index.tsx          -- Main component, state machine, orchestration
  LotterySlot.tsx    -- The animated slot that cycles through names
  LotteryResult.tsx  -- The post-draw result display
  LotteryTool.css    -- Keyframes and utility classes
```

---

## 3. Type Definitions

### Embedded Tool Type (add to MessageItem's EmbeddedTool union)

```typescript
// In src/components/Chat/MessageList/MessageItem.tsx, add to the EmbeddedTool union:
| {
  type: "lottery";
  taskTitle: string;
  taskDescription?: string;
  selectedMemberId?: Id<"members">;
  status: "pending" | "drawn";
  drawnAt?: number;
}
```

### Component Props

```typescript
// src/components/Chat/LotteryTool/index.tsx

export type EmbeddedLottery = {
  type: "lottery";
  taskTitle: string;
  taskDescription?: string;
  selectedMemberId?: Id<"members">;
  status: "pending" | "drawn";
  drawnAt?: number;
};

type LotteryToolProps = {
  messageId: Id<"messages">;
  tool: EmbeddedLottery;
  isAuthor: boolean;
};
```

### Member Display Type

```typescript
type LotteryMember = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};
```

---

## 4. Component Architecture

### LotteryTool (index.tsx)

The main component manages the animation state machine and delegates rendering to child components.

```tsx
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { LotterySlot } from "./LotterySlot";
import { LotteryResult } from "./LotteryResult";
import type { EmbeddedLottery } from "./index";
import "./LotteryTool.css";

type AnimationPhase =
  | "idle_pre_draw"
  | "shuffling"
  | "decelerating"
  | "revealing"
  | "idle_post_draw";

export const LotteryTool = ({ messageId, tool, isAuthor }: LotteryToolProps) => {
  const { t } = useTranslation("chat");

  // Fetch eligible members for this channel
  const eligibleMembers = useQuery(
    api.chat.functions.getLotteryEligibleMembers,
    { messageId }
  );

  // Mutation to trigger the draw
  const drawLottery = useMutation(api.chat.functions.drawLottery);

  // Determine initial phase:
  // If the tool already has a result (status === "drawn"), skip to post-draw.
  // Only animate if we transition from pending -> drawn while mounted.
  const [phase, setPhase] = useState<AnimationPhase>(
    tool.status === "drawn" ? "idle_post_draw" : "idle_pre_draw"
  );

  // Track whether we've seen the transition from pending to drawn
  const prevStatusRef = useRef(tool.status);
  const hasAnimatedRef = useRef(tool.status === "drawn");

  // Reduced motion detection
  const prefersReducedMotion = useRef(
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  // When tool.status changes from "pending" to "drawn", trigger animation
  useEffect(() => {
    if (
      prevStatusRef.current === "pending" &&
      tool.status === "drawn" &&
      !hasAnimatedRef.current
    ) {
      hasAnimatedRef.current = true;

      if (prefersReducedMotion.current) {
        // Skip animation entirely
        setPhase("idle_post_draw");
      } else {
        // Start the animation sequence
        setPhase("shuffling");
      }
    }
    prevStatusRef.current = tool.status;
  }, [tool.status]);

  // Animation phase progression timers
  useEffect(() => {
    if (phase === "shuffling") {
      const timer = setTimeout(() => setPhase("decelerating"), 1200);
      return () => clearTimeout(timer);
    }
    if (phase === "decelerating") {
      const timer = setTimeout(() => setPhase("revealing"), 800);
      return () => clearTimeout(timer);
    }
    if (phase === "revealing") {
      const timer = setTimeout(() => setPhase("idle_post_draw"), 600);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Handle draw button click
  const handleDraw = useCallback(() => {
    void drawLottery({ messageId });
  }, [messageId, drawLottery]);

  // Resolve the selected member from the eligible list
  const selectedMember = useMemo(() => {
    if (!tool.selectedMemberId || !eligibleMembers) return null;
    return eligibleMembers.find((m) => m._id === tool.selectedMemberId) ?? null;
  }, [tool.selectedMemberId, eligibleMembers]);

  const isAnimating =
    phase === "shuffling" ||
    phase === "decelerating" ||
    phase === "revealing";

  return (
    <div className="mt-2 border border-border-default rounded-lg overflow-hidden bg-surface-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-default bg-surface-primary">
        {/* Dice icon SVG -- see SVG Assets section */}
        <DiceIcon />
        <span className="text-sm font-semibold text-dark dark:text-light truncate flex-1">
          {tool.taskTitle}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
          tool.status === "drawn"
            ? "bg-surface-secondary text-text-description"
            : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
        }`}>
          {tool.status === "drawn" ? t("lotteryDrawn") : t("lotteryPending")}
        </span>
      </div>

      {/* Optional task description */}
      {tool.taskDescription && (
        <div className="px-3 py-1.5 text-xs text-text-secondary">
          {tool.taskDescription}
        </div>
      )}

      {/* Body */}
      <div className="px-3 py-2">
        {/* Pre-draw: show eligible members and Draw button */}
        {phase === "idle_pre_draw" && (
          <div className="space-y-2">
            {/* Avatar row */}
            {eligibleMembers && eligibleMembers.length > 0 && (
              <div className="flex items-center gap-1">
                {eligibleMembers.slice(0, 8).map((m) => (
                  <MemberAvatar key={m._id} member={m} size={24} />
                ))}
                {eligibleMembers.length > 8 && (
                  <span className="text-xs text-text-tertiary ml-1">
                    +{eligibleMembers.length - 8}
                  </span>
                )}
                <span className="text-xs text-text-secondary ml-auto">
                  {t("lotteryMemberCount", { count: eligibleMembers.length })}
                </span>
              </div>
            )}

            {/* Draw button -- only the author can trigger */}
            {isAuthor && (
              <button
                onClick={handleDraw}
                disabled={!eligibleMembers || eligibleMembers.length === 0}
                className="w-full py-2 text-sm font-medium rounded-md bg-highlight text-dark hover:bg-highlight-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={t("lotteryDrawAriaLabel", { task: tool.taskTitle })}
              >
                {t("lotteryDrawButton")}
              </button>
            )}

            {!isAuthor && (
              <p className="text-xs text-text-tertiary italic">
                {t("lotteryWaitingForDraw")}
              </p>
            )}
          </div>
        )}

        {/* Animating: show the slot */}
        {isAnimating && eligibleMembers && (
          <LotterySlot
            members={eligibleMembers}
            selectedMember={selectedMember}
            phase={phase}
          />
        )}

        {/* Reveal phase: show slot landing + celebration */}
        {phase === "revealing" && selectedMember && (
          <div className="lottery-reveal-container relative flex items-center justify-center">
            {/* Pulse ring SVG */}
            <svg
              className="lottery-pulse-ring absolute"
              width="48"
              height="48"
              viewBox="0 0 48 48"
              aria-hidden="true"
              style={{
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
              }}
            >
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="var(--org-highlight-color, #eac840)"
                strokeWidth="2"
              />
            </svg>
          </div>
        )}

        {/* Post-draw: static result */}
        {phase === "idle_post_draw" && selectedMember && (
          <LotteryResult
            member={selectedMember}
            memberCount={eligibleMembers?.length ?? 0}
          />
        )}
      </div>

      {/* Accessibility: live region for screen reader announcements */}
      <div role="status" aria-live="polite" className="sr-only">
        {isAnimating && t("lotteryDrawing")}
        {phase === "idle_post_draw" &&
          selectedMember &&
          t("lotteryResultAnnouncement", {
            name: `${selectedMember.firstname} ${selectedMember.surname}`,
            task: tool.taskTitle,
          })}
      </div>
    </div>
  );
};
```

### LotterySlot (LotterySlot.tsx)

The animated slot that cycles through member names during shuffle and deceleration phases.

```tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

type LotteryMember = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};

type LotterySlotProps = {
  members: LotteryMember[];
  selectedMember: LotteryMember | null;
  phase: "shuffling" | "decelerating" | "revealing";
};

export const LotterySlot = ({
  members,
  selectedMember,
  phase,
}: LotterySlotProps) => {
  const [currentMember, setCurrentMember] = useState<LotteryMember>(
    members[0]
  );
  const [isLanding, setIsLanding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Shuffle: pick random members at decreasing speed
  useEffect(() => {
    if (phase === "shuffling") {
      // Apply will-change hint for the duration of animation
      if (containerRef.current) {
        containerRef.current.style.willChange = "transform, opacity";
      }

      let delay = 80; // Start fast

      const step = () => {
        const randomIndex = Math.floor(Math.random() * members.length);
        setCurrentMember(members[randomIndex]);
        stepRef.current += 1;

        // Gradually slow down within the shuffle phase
        if (stepRef.current > 5) delay = 100;
        if (stepRef.current > 10) delay = 130;
        if (stepRef.current > 14) delay = 160;

        intervalRef.current = setTimeout(step, delay);
      };

      intervalRef.current = setTimeout(step, delay);

      return () => {
        if (intervalRef.current) clearTimeout(intervalRef.current);
      };
    }
  }, [phase, members]);

  // Deceleration: continue slowing, land on the selected member
  useEffect(() => {
    if (phase === "decelerating" && selectedMember) {
      // Clear any remaining shuffle timer
      if (intervalRef.current) clearTimeout(intervalRef.current);

      // Pre-planned deceleration sequence
      const sequence = [
        { delay: 160, member: members[Math.floor(Math.random() * members.length)] },
        { delay: 200, member: members[Math.floor(Math.random() * members.length)] },
        { delay: 280, member: members[Math.floor(Math.random() * members.length)] },
        { delay: 360, member: selectedMember }, // Final: the winner
      ];

      let elapsed = 0;
      const timers: ReturnType<typeof setTimeout>[] = [];

      sequence.forEach((step, i) => {
        elapsed += step.delay;
        const timer = setTimeout(() => {
          setCurrentMember(step.member);
          if (i === sequence.length - 1) {
            setIsLanding(true);
          }
        }, elapsed);
        timers.push(timer);
      });

      return () => {
        timers.forEach(clearTimeout);
      };
    }
  }, [phase, selectedMember, members]);

  // Remove will-change after animation completes
  useEffect(() => {
    if (phase === "revealing" && containerRef.current) {
      containerRef.current.style.willChange = "auto";
    }
  }, [phase]);

  const displayName = `${currentMember.firstname} ${currentMember.surname}`;

  return (
    <div
      ref={containerRef}
      className="lottery-slot-container relative h-12 flex items-center justify-center overflow-hidden rounded-md bg-surface-primary"
      aria-hidden="true"
    >
      <div
        key={`${currentMember._id}-${stepRef.current}`}
        className={`lottery-slot-item flex items-center gap-2 px-3 ${
          isLanding ? "lottery-slot-land" : "lottery-slot-cycle"
        }`}
      >
        <MemberAvatar member={currentMember} size={32} />
        <span className={`text-sm font-medium text-dark dark:text-light truncate ${
          isLanding ? "lottery-glow" : ""
        }`}>
          {displayName}
        </span>
      </div>
    </div>
  );
};
```

### LotteryResult (LotteryResult.tsx)

The static result display shown after animation or for historical messages.

```tsx
import { useTranslation } from "react-i18next";
import { Id } from "../../../../convex/_generated/dataModel";

type LotteryMember = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};

type LotteryResultProps = {
  member: LotteryMember;
  memberCount: number;
};

export const LotteryResult = ({ member, memberCount }: LotteryResultProps) => {
  const { t } = useTranslation("chat");

  return (
    <div className="flex items-center gap-3 py-1">
      <MemberAvatar member={member} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-dark dark:text-light truncate">
            {member.firstname} {member.surname}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 shrink-0">
            {t("lotterySelected")}
          </span>
        </div>
        <span className="text-xs text-text-tertiary">
          {t("lotteryDrawnFrom", { count: memberCount })}
        </span>
      </div>
    </div>
  );
};
```

### MemberAvatar (shared helper)

This component can be extracted to a shared location or kept local. It follows the same pattern as the avatar in `MessageItem`:

```tsx
const MemberAvatar = ({
  member,
  size,
}: {
  member: { firstname: string; surname: string; pictureURL?: string };
  size: number;
}) => {
  const initials =
    `${member.firstname[0] ?? ""}${member.surname[0] ?? ""}`.toUpperCase();

  return (
    <div
      className="shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size }}
    >
      {member.pictureURL ? (
        <img
          src={member.pictureURL}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <span
          className="font-medium text-text-description"
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </span>
      )}
    </div>
  );
};
```

---

## 5. State Machine

```
                                    (mount with status="drawn")
                                    ─────────────────────────────> idle_post_draw
                                    |
idle_pre_draw ──(Convex update: status="drawn")──> shuffling ──(1200ms)──> decelerating ──(800ms)──> revealing ──(600ms)──> idle_post_draw
                                                       |
                                              (reduced motion)
                                                       |
                                                       └─────────────────────────────────────────> idle_post_draw
```

### State Descriptions

| State | Renders | User Interaction |
|-------|---------|-----------------|
| `idle_pre_draw` | Task title, member pool, "Draw" button | Author can click "Draw" |
| `shuffling` | Animated slot cycling through random members | None (button gone) |
| `decelerating` | Slot slowing down, approaching winner | None |
| `revealing` | Winner in slot + pulse ring + glow | None |
| `idle_post_draw` | Static result with winner name and "Selected" badge | None |

### Transition Triggers

| From | To | Trigger |
|------|----|---------|
| `idle_pre_draw` | `shuffling` | Convex real-time update: `tool.status` changes from `"pending"` to `"drawn"` |
| `shuffling` | `decelerating` | 1200ms `setTimeout` |
| `decelerating` | `revealing` | 800ms `setTimeout` |
| `revealing` | `idle_post_draw` | 600ms `setTimeout` |
| `idle_pre_draw` | `idle_post_draw` | Reduced motion preference active (immediate on status change) |
| (mount) | `idle_post_draw` | Component mounts with `tool.status === "drawn"` (historical message) |

---

## 6. CSS Keyframes & Classes

File: `src/components/Chat/LotteryTool/LotteryTool.css`

```css
/* ============================================
   Lottery Tool Animation Keyframes
   ============================================ */

/* Phase 2-3: Name cycling through the slot */
@keyframes lotterySlotCycle {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  to {
    transform: translateY(-100%);
    opacity: 0;
  }
}

/* Phase 3 final: Name lands in place with spring overshoot */
@keyframes lotterySlotLand {
  from {
    transform: translateY(50%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Phase 4: Expanding pulse ring behind winner avatar */
@keyframes lotteryPulseRing {
  from {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.4;
  }
  to {
    transform: translate(-50%, -50%) scale(2.2);
    opacity: 0;
  }
}

/* Phase 4: Text glow on winner name */
@keyframes lotteryGlow {
  0% {
    text-shadow: 0 0 0 transparent;
  }
  50% {
    text-shadow: 0 0 12px var(--org-highlight-color, #eac840);
  }
  100% {
    text-shadow: 0 0 4px color-mix(in srgb, var(--org-highlight-color, #eac840) 25%, transparent);
  }
}

/* Phase 4: "Selected" badge slide-in */
@keyframes lotteryBadgeIn {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}


/* ============================================
   Utility Classes
   ============================================ */

.lottery-slot-cycle {
  animation: lotterySlotCycle 200ms ease-out both;
}

.lottery-slot-land {
  animation: lotterySlotLand 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.lottery-pulse-ring circle {
  animation: lotteryPulseRing 600ms ease-out both;
}

.lottery-glow {
  animation: lotteryGlow 500ms ease-out both;
}

.lottery-badge-enter {
  animation: lotteryBadgeIn 300ms ease-out 200ms both;
}


/* ============================================
   Reduced Motion
   ============================================ */

@media (prefers-reduced-motion: reduce) {
  .lottery-slot-cycle,
  .lottery-slot-land,
  .lottery-glow,
  .lottery-badge-enter {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  .lottery-pulse-ring {
    display: none !important;
  }

  .lottery-slot-container {
    transition: opacity 150ms ease-out !important;
  }
}
```

---

## 7. SVG Assets

### Dice Icon (Header)

Used in the tool header, consistent with existing tool icons (VotingTool uses a checkbox, TopicTool uses a speech bubble). A five-dot dice face conveys randomness.

```jsx
const DiceIcon = () => (
  <svg
    className="w-4 h-4 text-highlight shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);
```

### Pulse Ring (Reveal Phase)

A single SVG circle that expands and fades. Positioned absolutely behind the winner's avatar.

```jsx
<svg
  className="lottery-pulse-ring absolute pointer-events-none"
  width="48"
  height="48"
  viewBox="0 0 48 48"
  aria-hidden="true"
  style={{
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  }}
>
  <circle
    cx="24"
    cy="24"
    r="20"
    fill="none"
    stroke="var(--org-highlight-color, #eac840)"
    strokeWidth="2"
  />
</svg>
```

Both SVGs are inline (no external file), minimal complexity, proper `viewBox`, `aria-hidden`, and theme-aware via `currentColor` / `var(--org-highlight-color)`.

---

## 8. Shuffle Algorithm

The shuffle does NOT need cryptographic randomness -- it is purely visual. The actual selection is determined by the backend. The visual shuffle is designed to feel organic:

### During Shuffle Phase (1200ms)

1. Pick a random index from the `members` array
2. Set that member as the displayed name
3. Wait for the current interval duration
4. Repeat

**Interval schedule** (approximate, implemented via step counter):

```
Steps  1-5:   80ms each  (fast, names blur)
Steps  6-10: 100ms each  (still fast, starting to read)
Steps 11-14: 130ms each  (slowing noticeably)
Steps 15+:   160ms each  (readable speed, transitions to deceleration)
```

### During Deceleration Phase (800ms)

A pre-planned sequence of 4 final names with increasing intervals:

```
Step 1: 160ms -- random member
Step 2: 200ms -- random member
Step 3: 280ms -- random member
Step 4: 360ms -- THE SELECTED MEMBER (final)
```

The selected member is always the last item. The three random members before it are chosen at mount time to avoid the selected member appearing in the penultimate positions (which would reduce suspense).

**Avoidance rule**: During deceleration, the random members in steps 1-3 must NOT be the selected member. If the pool has only 1 member, skip the shuffle entirely and go directly to reveal.

---

## 9. Integration with MessageItem

### Changes to MessageItem.tsx

Add the lottery tool to the existing embedded tool detection:

```typescript
// Add to the EmbeddedTool union type:
| {
  type: "lottery";
  taskTitle: string;
  taskDescription?: string;
  selectedMemberId?: Id<"members">;
  status: "pending" | "drawn";
  drawnAt?: number;
}

// Add detection alongside existing tools:
const lotteryTool = message.embeddedTool?.type === "lottery"
  ? (message.embeddedTool as EmbeddedLottery)
  : null;

// Update hasEmbeddedTool:
const hasEmbeddedTool = topicTool || votingTool || electionTool || lotteryTool;

// Add rendering (alongside other tools):
{lotteryTool && (
  <LotteryTool
    messageId={message._id}
    tool={lotteryTool}
    isAuthor={isAuthor}
  />
)}
```

### Import

```typescript
import { LotteryTool } from "../LotteryTool";
import type { EmbeddedLottery } from "../LotteryTool";
```

---

## 10. Accessibility

### ARIA Roles & Labels

| Element | Attribute | Value |
|---------|-----------|-------|
| "Draw" button | `aria-label` | "Randomly select a member for [task title]" |
| Slot container (during animation) | `aria-hidden` | `"true"` |
| Live region (sr-only div) | `role="status"` `aria-live="polite"` | Announces "Drawing..." then the result |
| Dice icon SVG | `aria-hidden` | `"true"` |
| Pulse ring SVG | `aria-hidden` | `"true"` |
| Member avatars | `alt=""` on `<img>` | Decorative |

### Screen Reader Announcements

1. **When draw starts**: "Drawing..." (via `aria-live="polite"`)
2. **When result appears**: "[Name] has been selected for [task title]" (via `aria-live="polite"`)
3. **Reduced motion**: Same announcements, just without the visual animation delay

### Keyboard Navigation

- The "Draw" button is focusable and activatable via Enter/Space
- The result state has no interactive elements (no keyboard trap)
- The tool card itself does not trap focus

---

## 11. Reduced Motion

When `prefers-reduced-motion: reduce` is active:

1. **Detection**: `window.matchMedia("(prefers-reduced-motion: reduce)").matches` checked once on mount, stored in a ref.

2. **Behavior**: When the Convex status transitions from `"pending"` to `"drawn"`:
   - Skip `shuffling`, `decelerating`, `revealing` phases entirely
   - Go directly from `idle_pre_draw` to `idle_post_draw`
   - The transition is a 150ms opacity crossfade (CSS handles this via the `.lottery-slot-container` transition)

3. **CSS safety net**: Even if the JS detection fails, the CSS `@media (prefers-reduced-motion: reduce)` block strips all keyframe animations with `!important`.

---

## 12. Edge Cases

| Scenario | Behavior |
|----------|----------|
| **Only 1 eligible member** | Skip shuffle entirely. Show the result immediately with a brief reveal animation (Phase 4 only). The "randomness" is still fair -- there is only one option. |
| **0 eligible members** | "Draw" button is disabled. Show a message: "No eligible members." |
| **Author draws, other users see** | All users in the channel receive the Convex real-time update. The animation plays for everyone who has the tool in view. |
| **User scrolls to historical lottery** | Component mounts with `status === "drawn"`. Phase is set to `idle_post_draw` on mount. No animation plays. |
| **User is offline when draw happens** | When they reconnect, Convex syncs the update. The component will mount/update with `status === "drawn"` and show the result without animation (same as historical). |
| **Very long member name (30+ chars)** | Names are truncated with `truncate` (text-overflow: ellipsis) in the slot. Max-width is constrained by the tool container. |
| **Window resize during animation** | The slot uses flex layout and `overflow: hidden`. Resize is handled gracefully -- the slot simply fills available width. |
| **Convex real-time update during shuffle** | The shuffle is visual-only and driven by local state. Convex updates to other fields do not affect the animation because the phase state machine is controlled by `setTimeout` and the `prevStatusRef` guard prevents re-triggering. |
| **Multiple rapid draws (if backend allows re-draw)** | The `hasAnimatedRef` prevents duplicate animation triggers for the same status transition. If a re-draw feature is added in the future, the ref would need to be reset. |

---

## 13. Color & Theme Integration

The Lottery Tool follows the same color conventions as all other chat tools:

| Element | Light Mode | Dark Mode | CSS |
|---------|------------|-----------|-----|
| Card background | `surface-secondary` | `surface-secondary` | `bg-surface-secondary` |
| Header background | `surface-primary` | `surface-primary` | `bg-surface-primary` |
| Header border | `border-default` | `border-default` | `border-border-default` |
| Status badge (pending) | Green 100/700 | Green 900/300 | Same as VotingTool "open" badge |
| Status badge (drawn) | Surface secondary | Surface secondary | Same as VotingTool "closed" badge |
| Draw button | Highlight | Highlight | `bg-highlight text-dark hover:bg-highlight-hover` |
| Dice icon | Highlight | Highlight | `text-highlight` |
| Pulse ring stroke | Org highlight | Org highlight | `var(--org-highlight-color, #eac840)` |
| Text glow | Org highlight | Org highlight | `var(--org-highlight-color, #eac840)` |
| "Selected" badge | Green 100/700 | Green 900/300 | Same as election "elected" badge |

All highlight colors respect org customization via `var(--org-highlight-color)` with `#eac840` (bee gold) as fallback.

---

## i18n Keys

Add these keys to the `chat` translation namespace:

```json
{
  "lotteryPending": "pending",
  "lotteryDrawn": "drawn",
  "lotteryDrawButton": "Draw",
  "lotteryDrawAriaLabel": "Randomly select a member for {{task}}",
  "lotteryDrawing": "Drawing...",
  "lotterySelected": "Selected",
  "lotteryMemberCount": "{{count}} members",
  "lotteryDrawnFrom": "Drawn from {{count}} members",
  "lotteryWaitingForDraw": "Waiting for the draw...",
  "lotteryResultAnnouncement": "{{name}} has been selected for {{task}}",
  "lotteryNoEligibleMembers": "No eligible members"
}
```

---

## Backend Contract (for Nadia)

The LotteryTool frontend expects these Convex endpoints:

### Query: `api.chat.functions.getLotteryEligibleMembers`

```typescript
args: { messageId: Id<"messages"> }
returns: v.array(v.object({
  _id: v.id("members"),
  firstname: v.string(),
  surname: v.string(),
  pictureURL: v.optional(v.string()),
}))
```

Returns all members in the channel who are eligible for the lottery draw.

### Mutation: `api.chat.functions.drawLottery`

```typescript
args: { messageId: Id<"messages"> }
returns: v.null()
```

Selects a random member and updates the message's `embeddedTool` to set `status: "drawn"`, `selectedMemberId`, and `drawnAt`. This mutation should be idempotent -- calling it on an already-drawn lottery is a no-op.

The backend must handle:
- Random selection (server-side, not client-side)
- Authorization: only the message author can trigger the draw
- Idempotency: if `status` is already `"drawn"`, return without error

---

*Specification Version: 1.0*
*Date: 2026-02-22*
*Author: Luigi (Animation/SVG Agent)*
*For implementation by: Chat team*
*Animation reference: [ANIMATION.md](./ANIMATION.md)*
