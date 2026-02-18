import { useTranslation } from "react-i18next";
import { Id } from "../../../../convex/_generated/dataModel";
import { VotingOpen } from "./VotingOpen";
import { VotingClosed } from "./VotingClosed";

export type EmbeddedVoting = {
  type: "voting";
  question: string;
  options: { id: string; label: string }[];
  mode: "single" | "approval" | "ranked";
  isAnonymous: boolean;
  deadline?: number;
  isClosed: boolean;
};

type VotingToolProps = {
  messageId: Id<"messages">;
  tool: EmbeddedVoting;
};

const modeLabelKeys = {
  single: "votingMode_single",
  approval: "votingMode_approval",
  ranked: "votingMode_ranked",
} as const;

export const VotingTool = ({ messageId, tool }: VotingToolProps) => {
  const { t } = useTranslation("chat");

  const isPastDeadline = tool.deadline ? tool.deadline < Date.now() : false;
  const isEffectivelyClosed = tool.isClosed || isPastDeadline;

  return (
    <div className="mt-2 border border-border-default rounded-lg overflow-hidden bg-surface-secondary">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-default bg-surface-primary">
        <svg className="w-4 h-4 text-highlight shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span className="text-sm font-semibold text-dark dark:text-light truncate flex-1">
          {tool.question}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-surface-tertiary text-text-description">
          {t(modeLabelKeys[tool.mode])}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
          isEffectivelyClosed
            ? "bg-surface-secondary text-text-description"
            : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
        }`}>
          {isEffectivelyClosed ? t("votingClosed") : t("votingOpen")}
        </span>
      </div>

      {/* Indicators */}
      <div className="px-3 py-1.5 flex items-center gap-3 text-xs text-text-secondary">
        {tool.isAnonymous && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
            {t("votingAnonymous")}
          </span>
        )}
        {tool.deadline && (
          <span>
            {t("votingDeadline")}: {new Date(tool.deadline).toLocaleString()}
          </span>
        )}
      </div>

      {/* Content */}
      {isEffectivelyClosed ? (
        <VotingClosed messageId={messageId} tool={tool} />
      ) : (
        <VotingOpen messageId={messageId} tool={tool} />
      )}
    </div>
  );
};
