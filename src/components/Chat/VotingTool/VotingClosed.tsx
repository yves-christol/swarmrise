import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { EmbeddedVoting } from "./index";

type VotingClosedProps = {
  messageId: Id<"messages">;
  tool: EmbeddedVoting;
};

export const VotingClosed = ({ messageId, tool }: VotingClosedProps) => {
  const { t } = useTranslation("chat");
  const results = useQuery(api.chat.functions.getVoteResults, { messageId });

  if (!results) return null;

  const maxCount = Math.max(...results.results.map((r) => r.count), 1);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      <div className="px-3 py-2 space-y-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {t("votingResults")} - {t("votingVoterCount", { count: results.totalVotes })}
        </div>

        {results.totalVotes === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("votingNoVotes")}</p>
        ) : (
          <div className="space-y-2">
            {results.results.map((r, i) => (
              <div key={r.optionId} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-dark dark:text-light font-medium">
                    {tool.mode === "ranked" && <span className="text-gray-400 mr-1">#{i + 1}</span>}
                    {r.label}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {r.count} ({results.totalVotes > 0 ? Math.round((r.count / results.totalVotes) * 100) : 0}%)
                    {tool.mode === "ranked" && r.score !== undefined && (
                      <span className="ml-1">- {t("votingScore")}: {r.score}</span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#eac840] rounded-full transition-all"
                    style={{ width: `${(r.count / maxCount) * 100}%` }}
                  />
                </div>
                {/* Voter names (non-anonymous only) */}
                {!tool.isAnonymous && r.voters && r.voters.length > 0 && (
                  <div className="text-xs text-gray-400 dark:text-gray-500 pl-1">
                    {r.voters.map((v) => `${v.firstname} ${v.surname}`).join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
