import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { EmbeddedElection } from "./index";

type ElectedPhaseProps = {
  messageId: Id<"messages">;
  tool: EmbeddedElection;
};

export const ElectedPhase = ({ messageId, tool }: ElectedPhaseProps) => {
  const { t } = useTranslation("chat");

  // Fetch eligible nominees to resolve the elected member's name
  const eligibleNominees = useQuery(api.chat.functions.getEligibleNominees, { messageId });

  const electedMember = tool.electedMemberId
    ? eligibleNominees?.find((m) => m._id === tool.electedMemberId)
    : null;

  const isElected = tool.outcome === "elected";

  return (
    <div className="border-t border-border-default px-3 py-2 space-y-2">
      {isElected && electedMember ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
              {t("electionOutcomeElected")}
            </span>
          </div>
          <p className="text-xs text-dark dark:text-light">
            {t("electionElectedMember", {
              name: `${electedMember.firstname} ${electedMember.surname}`,
              role: tool.roleTitle,
            })}
          </p>
        </div>
      ) : isElected ? (
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
            {t("electionOutcomeElected")}
          </span>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-surface-secondary text-text-description">
              {t("electionOutcomeNoElection")}
            </span>
          </div>
          <p className="text-xs text-dark dark:text-light">
            {t("electionNoElectionResult", { role: tool.roleTitle })}
          </p>
        </div>
      )}
      <p className="text-xs text-text-secondary italic">
        {t("electionDecisionRecorded")}
      </p>
    </div>
  );
};
