import { useState, useEffect, useRef } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

type LotteryMember = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};

type AnimationPhase = "shuffling" | "decelerating" | "revealing";

type LotteryAnimationProps = {
  members: LotteryMember[];
  selectedMember: LotteryMember | null;
  phase: AnimationPhase;
};

export const LotteryAnimation = ({
  members,
  selectedMember,
  phase,
}: LotteryAnimationProps) => {
  const [currentMember, setCurrentMember] = useState<LotteryMember>(members[0]);
  const [isLanding, setIsLanding] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stepRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Shuffle: pick random members at decreasing speed
  useEffect(() => {
    if (phase === "shuffling") {
      if (containerRef.current) {
        containerRef.current.style.willChange = "transform, opacity";
      }

      let delay = 80;

      const step = () => {
        const randomIndex = Math.floor(Math.random() * members.length);
        setCurrentMember(members[randomIndex]);
        stepRef.current += 1;

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
      if (intervalRef.current) clearTimeout(intervalRef.current);

      // Filter out the selected member for the random steps to build suspense
      const others = members.filter((m) => m._id !== selectedMember._id);
      const pickRandom = () =>
        others.length > 0
          ? others[Math.floor(Math.random() * others.length)]
          : members[Math.floor(Math.random() * members.length)];

      const sequence = [
        { delay: 160, member: pickRandom() },
        { delay: 200, member: pickRandom() },
        { delay: 280, member: pickRandom() },
        { delay: 360, member: selectedMember },
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

  const initials = `${currentMember.firstname[0] ?? ""}${currentMember.surname[0] ?? ""}`.toUpperCase();
  const displayName = `${currentMember.firstname} ${currentMember.surname}`;

  return (
    <div
      ref={containerRef}
      className="lottery-slot-container relative h-12 flex items-center justify-center overflow-hidden rounded-md bg-surface-primary"
      aria-hidden="true"
    >
      <div
        key={`${currentMember._id}-${stepRef.current}`}
        className={`flex items-center gap-2 px-3 ${
          isLanding ? "lottery-slot-land" : "lottery-slot-cycle"
        }`}
      >
        <div className="w-8 h-8 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
          {currentMember.pictureURL ? (
            <img src={currentMember.pictureURL} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-medium text-text-description">{initials}</span>
          )}
        </div>
        <span
          className={`text-sm font-medium text-dark dark:text-light truncate ${
            isLanding ? "lottery-glow" : ""
          }`}
        >
          {displayName}
        </span>
      </div>

      {/* Pulse ring on reveal */}
      {phase === "revealing" && isLanding && (
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
      )}
    </div>
  );
};
