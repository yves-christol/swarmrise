import { useTranslation } from "react-i18next";
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
  phase: "nomination" | "discussion" | "change_round" | "consent" | "elected";
  proposedCandidateId?: Id<"members">;
  electedMemberId?: Id<"members">;
  outcome?: "elected" | "no_election";
  decisionId?: Id<"decisions">;
};

type ElectionToolProps = {
  messageId: Id<"messages">;
  tool: EmbeddedElection;
};

const phaseColors: Record<string, string> = {
  nomination: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  discussion: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  change_round: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  consent: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  elected: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const phaseLabelKeys = {
  nomination: "electionPhaseNomination",
  discussion: "electionPhaseDiscussion",
  change_round: "electionPhaseChangeRound",
  consent: "electionPhaseConsent",
  elected: "electionPhaseElected",
} as const;

export const ElectionTool = ({ messageId, tool }: ElectionToolProps) => {
  const { t } = useTranslation("chat");

  const phaseLabel = t(phaseLabelKeys[tool.phase]);
  const phaseColor = phaseColors[tool.phase];

  return (
    <div className="mt-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/50">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <svg className="w-4 h-4 text-[#eac840] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="text-sm font-semibold text-dark dark:text-light truncate flex-1">
          {t("electionTool")}: {tool.roleTitle}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${phaseColor}`}>
          {phaseLabel}
        </span>
      </div>

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
    </div>
  );
};
