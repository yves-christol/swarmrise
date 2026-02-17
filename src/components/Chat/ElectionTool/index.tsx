import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { NominationPhase } from "./NominationPhase";
import { DiscussionPhase } from "./DiscussionPhase";
import { ChangeRoundPhase } from "./ChangeRoundPhase";
import { ConsentPhase } from "./ConsentPhase";
import { ElectedPhase } from "./ElectedPhase";

export type EmbeddedElection = {
  type: "election";
  roleTitle: string;
  roleId?: Id<"roles">;
  teamId: Id<"teams">;
  phase: "nomination" | "discussion" | "change_round" | "consent" | "elected" | "cancelled";
  proposedCandidateId?: Id<"members">;
  electedMemberId?: Id<"members">;
  outcome?: "elected" | "no_election";
  decisionId?: Id<"decisions">;
};

type ElectionToolProps = {
  messageId: Id<"messages">;
  tool: EmbeddedElection;
  isAuthor: boolean;
};

const phaseColors: Record<string, string> = {
  nomination: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  discussion: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  change_round: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  consent: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  elected: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const phaseLabelKeys = {
  nomination: "electionPhaseNomination",
  discussion: "electionPhaseDiscussion",
  change_round: "electionPhaseChangeRound",
  consent: "electionPhaseConsent",
  elected: "electionPhaseElected",
  cancelled: "electionPhaseCancelled",
} as const;

export const ElectionTool = ({ messageId, tool, isAuthor }: ElectionToolProps) => {
  const { t } = useTranslation("chat");
  const [showConfirm, setShowConfirm] = useState(false);

  const cancelElection = useMutation(api.chat.functions.cancelElection);

  const canCancel = isAuthor && tool.phase !== "elected" && tool.phase !== "cancelled";

  const handleCancel = useCallback(() => {
    void cancelElection({ messageId }).then(() => setShowConfirm(false));
  }, [messageId, cancelElection]);

  const phaseLabel = t(phaseLabelKeys[tool.phase]);
  const phaseColor = phaseColors[tool.phase];

  return (
    <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/50">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <svg className="w-4 h-4 text-highlight shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="text-sm font-semibold text-dark dark:text-light truncate flex-1">
          {t("electionTool")}: {tool.roleTitle}
        </span>
        {canCancel && !showConfirm && (
          <button
            onClick={() => setShowConfirm(true)}
            className="text-xs px-2 py-0.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            {t("electionCancel")}
          </button>
        )}
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${phaseColor}`}>
          {phaseLabel}
        </span>
      </div>

      {/* Cancel confirmation */}
      {showConfirm && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 flex items-center gap-2">
          <span className="text-xs text-red-700 dark:text-red-300 flex-1">
            {t("electionCancelConfirm")}
          </span>
          <button
            onClick={handleCancel}
            className="text-xs px-3 py-1 rounded-md bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
          >
            {t("electionCancelYes")}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-xs px-3 py-1 rounded-md bg-slate-200 dark:bg-slate-600 text-dark dark:text-light font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
          >
            {t("electionCancelNo")}
          </button>
        </div>
      )}

      {/* Phase-specific content */}
      {tool.phase === "nomination" && (
        <NominationPhase messageId={messageId} />
      )}
      {tool.phase === "discussion" && (
        <DiscussionPhase messageId={messageId} tool={tool} />
      )}
      {tool.phase === "change_round" && (
        <ChangeRoundPhase messageId={messageId} tool={tool} />
      )}
      {tool.phase === "consent" && (
        <ConsentPhase messageId={messageId} tool={tool} />
      )}
      {tool.phase === "elected" && (
        <ElectedPhase messageId={messageId} tool={tool} />
      )}
      {tool.phase === "cancelled" && (
        <div className="px-3 py-3 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            {t("electionCancelled")}
          </p>
        </div>
      )}
    </div>
  );
};
