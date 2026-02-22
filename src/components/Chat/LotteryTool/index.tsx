import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { LotteryPending } from "./LotteryPending";
import { LotteryDrawn } from "./LotteryDrawn";
import { LotteryAnimation } from "./LotteryAnimation";
import "./LotteryTool.css";

export type EmbeddedLottery = {
  type: "lottery";
  description: string;
  status: "pending" | "drawn";
  selectedMemberId?: Id<"members">;
  drawnByMemberId?: Id<"members">;
  drawnAt?: number;
  poolSize?: number;
};

type LotteryToolProps = {
  messageId: Id<"messages">;
  tool: EmbeddedLottery;
};

type AnimationPhase =
  | "idle_pre_draw"
  | "shuffling"
  | "decelerating"
  | "revealing"
  | "idle_post_draw";

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

export const LotteryTool = ({ messageId, tool }: LotteryToolProps) => {
  const { t } = useTranslation("chat");

  const details = useQuery(api.chat.functions.getLotteryDetails, { messageId });
  const drawLottery = useMutation(api.chat.functions.drawLottery);

  const [phase, setPhase] = useState<AnimationPhase>(
    tool.status === "drawn" ? "idle_post_draw" : "idle_pre_draw"
  );
  const [isDrawing, setIsDrawing] = useState(false);

  const prevStatusRef = useRef(tool.status);
  const hasAnimatedRef = useRef(tool.status === "drawn");

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
      setIsDrawing(false);

      if (prefersReducedMotion.current) {
        setPhase("idle_post_draw");
      } else {
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

  const handleDraw = useCallback(() => {
    setIsDrawing(true);
    void drawLottery({ messageId }).catch(() => {
      setIsDrawing(false);
    });
  }, [messageId, drawLottery]);

  const selectedMember = useMemo(() => {
    if (!details?.selectedMember) return null;
    return details.selectedMember;
  }, [details?.selectedMember]);

  const isAnimating =
    phase === "shuffling" ||
    phase === "decelerating" ||
    phase === "revealing";

  if (!details) return null;

  return (
    <div className="mt-2 border border-border-default rounded-lg overflow-hidden bg-surface-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-default bg-surface-primary">
        <DiceIcon />
        <span className="text-sm font-semibold text-dark dark:text-light truncate flex-1">
          {tool.description}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
            tool.status === "drawn"
              ? "bg-surface-secondary text-text-description"
              : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          }`}
        >
          {tool.status === "drawn" ? t("lotteryDrawn") : t("lotteryPending")}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {phase === "idle_pre_draw" && (
          <LotteryPending
            pool={details.pool}
            onDraw={handleDraw}
            isDrawing={isDrawing}
          />
        )}

        {isAnimating && details.pool.length > 0 && (
          <LotteryAnimation
            members={details.pool}
            selectedMember={selectedMember}
            phase={phase as "shuffling" | "decelerating" | "revealing"}
          />
        )}

        {phase === "idle_post_draw" && selectedMember && (
          <LotteryDrawn
            selectedMember={selectedMember}
            drawnByMember={details.drawnByMember}
            poolSize={details.poolSize ?? details.pool.length}
            drawnAt={details.drawnAt}
          />
        )}
      </div>

      {/* Accessibility: live region */}
      <div role="status" aria-live="polite" className="sr-only">
        {isAnimating && t("lotteryDrawing")}
        {phase === "idle_post_draw" &&
          selectedMember &&
          t("lotteryResultAnnouncement", {
            name: `${selectedMember.firstname} ${selectedMember.surname}`,
            task: tool.description,
          })}
      </div>
    </div>
  );
};
