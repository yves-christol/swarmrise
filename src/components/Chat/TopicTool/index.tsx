import { useTranslation } from "react-i18next";
import { Id } from "../../../../convex/_generated/dataModel";
import { ClarificationPhase } from "./ClarificationPhase";
import { ConsentPhase } from "./ConsentPhase";
import { ResolvedPhase } from "./ResolvedPhase";

type EmbeddedTopic = {
  type: "topic";
  title: string;
  description: string;
  phase: "proposition" | "clarification" | "consent" | "resolved";
  outcome?: "accepted" | "modified" | "withdrawn";
  decisionId?: Id<"decisions">;
};

type TopicToolProps = {
  messageId: Id<"messages">;
  tool: EmbeddedTopic;
};

const phaseColors: Record<string, string> = {
  proposition: "bg-surface-tertiary text-text-description",
  clarification: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  consent: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const phaseLabelKeys = {
  proposition: "topicPhaseProposition",
  clarification: "topicPhaseClarification",
  consent: "topicPhaseConsent",
  resolved: "topicPhaseResolved",
} as const;

export const TopicTool = ({ messageId, tool }: TopicToolProps) => {
  const { t } = useTranslation("chat");

  const phaseLabel = t(phaseLabelKeys[tool.phase]);
  const phaseColor = phaseColors[tool.phase];

  return (
    <div className="mt-2 border border-border-default rounded-lg overflow-hidden bg-surface-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-default bg-surface-primary">
        <svg className="w-4 h-4 text-highlight shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span className="text-sm font-semibold text-dark dark:text-light truncate flex-1">
          {tool.title}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${phaseColor}`}>
          {phaseLabel}
        </span>
      </div>

      {/* Description */}
      <div className="px-3 py-2 text-sm text-text-description whitespace-pre-wrap">
        {tool.description}
      </div>

      {/* Phase-specific content */}
      {tool.phase === "clarification" && (
        <ClarificationPhase messageId={messageId} />
      )}
      {tool.phase === "consent" && (
        <ConsentPhase messageId={messageId} />
      )}
      {tool.phase === "resolved" && (
        <ResolvedPhase outcome={tool.outcome} />
      )}
    </div>
  );
};
