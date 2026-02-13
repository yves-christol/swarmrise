import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { EmbeddedVoting } from "./index";

type VotingOpenProps = {
  messageId: Id<"messages">;
  tool: EmbeddedVoting;
};

export const VotingOpen = ({ messageId, tool }: VotingOpenProps) => {
  const { t } = useTranslation("chat");

  const results = useQuery(api.chat.functions.getVoteResults, { messageId });
  const myVote = useQuery(api.chat.functions.getMyVote, { messageId });
  const isFacilitator = useQuery(api.chat.functions.canFacilitate, { messageId });

  const submitVote = useMutation(api.chat.functions.submitVote);
  const closeVote = useMutation(api.chat.functions.closeVote);

  // Local selection state
  const [selectedSingle, setSelectedSingle] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Set<string>>(new Set());
  const [rankedOrder, setRankedOrder] = useState<string[]>(() => tool.options.map((o) => o.id));
  const [isEditing, setIsEditing] = useState(false);

  // If user already voted and not editing, show their current vote
  const hasVoted = !!myVote;
  const showForm = !hasVoted || isEditing;

  const handleSubmit = useCallback(() => {
    let choices: string[];
    if (tool.mode === "single") {
      if (!selectedSingle) return;
      choices = [selectedSingle];
    } else if (tool.mode === "approval") {
      if (selectedApproval.size === 0) return;
      choices = Array.from(selectedApproval);
    } else {
      choices = rankedOrder;
    }

    void submitVote({ messageId, choices }).then(() => {
      setIsEditing(false);
    });
  }, [tool.mode, selectedSingle, selectedApproval, rankedOrder, messageId, submitVote]);

  const handleChangeVote = useCallback(() => {
    if (!myVote) return;
    // Pre-populate form with current vote
    if (tool.mode === "single") {
      setSelectedSingle(myVote.choices[0] ?? null);
    } else if (tool.mode === "approval") {
      setSelectedApproval(new Set(myVote.choices));
    } else {
      setRankedOrder(myVote.choices);
    }
    setIsEditing(true);
  }, [myVote, tool.mode]);

  const handleClose = useCallback(() => {
    void closeVote({ messageId });
  }, [messageId, closeVote]);

  const moveRanked = useCallback((index: number, direction: -1 | 1) => {
    setRankedOrder((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const optionLabel = (id: string) => tool.options.find((o) => o.id === id)?.label ?? id;

  // Max count for bar width
  const maxCount = results ? Math.max(...results.results.map((r) => r.count), 1) : 1;

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      {/* Live results bar chart */}
      {results && results.totalVotes > 0 && (
        <div className="px-3 py-2 space-y-1.5">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("votingVoterCount", { count: results.totalVotes })}
          </div>
          {results.results.map((r) => (
            <div key={r.optionId} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-dark dark:text-light">{r.label}</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {r.count}
                  {tool.mode === "ranked" && r.score !== undefined && (
                    <span className="ml-1">({t("votingScore")}: {r.score})</span>
                  )}
                </span>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#eac840] rounded-full transition-all"
                  style={{ width: `${(r.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {results && results.totalVotes === 0 && (
        <div className="px-3 py-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("votingNoVotes")}</p>
        </div>
      )}

      {/* Voting form */}
      {showForm && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {tool.mode === "single" && (
            <div className="space-y-1">
              {tool.options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-xs text-dark dark:text-light cursor-pointer">
                  <input
                    type="radio"
                    name={`vote-${messageId}`}
                    checked={selectedSingle === opt.id}
                    onChange={() => setSelectedSingle(opt.id)}
                    className="accent-[#eac840]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          {tool.mode === "approval" && (
            <div className="space-y-1">
              {tool.options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-xs text-dark dark:text-light cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedApproval.has(opt.id)}
                    onChange={(e) => {
                      setSelectedApproval((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(opt.id);
                        else next.delete(opt.id);
                        return next;
                      });
                    }}
                    className="accent-[#eac840]"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          )}

          {tool.mode === "ranked" && (
            <div className="space-y-1">
              {rankedOrder.map((optId, i) => (
                <div key={optId} className="flex items-center gap-2 text-xs text-dark dark:text-light">
                  <span className="w-4 text-right text-gray-400 shrink-0">{i + 1}.</span>
                  <span className="flex-1">{optionLabel(optId)}</span>
                  <button
                    onClick={() => moveRanked(i, -1)}
                    disabled={i === 0}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    aria-label={t("votingMoveUp")}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveRanked(i, 1)}
                    disabled={i === rankedOrder.length - 1}
                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    aria-label={t("votingMoveDown")}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={
                (tool.mode === "single" && !selectedSingle) ||
                (tool.mode === "approval" && selectedApproval.size === 0)
              }
              className="text-xs px-3 py-1.5 rounded-md bg-[#eac840] text-dark font-medium hover:bg-[#d4b435] disabled:opacity-40 transition-colors"
            >
              {hasVoted ? t("votingChangeVote") : t("votingSubmitVote")}
            </button>
            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                className="text-xs px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-dark dark:text-light hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                {t("votingCancel")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Current vote indicator when not editing */}
      {hasVoted && !isEditing && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
            {t("votingYourVote")}: {myVote.choices.map((c) => optionLabel(c)).join(", ")}
          </span>
          <button
            onClick={handleChangeVote}
            className="text-xs text-[#996800] dark:text-[#eac840] hover:underline"
          >
            {t("votingChangeVote")}
          </button>
        </div>
      )}

      {/* Facilitator controls */}
      {isFacilitator && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={handleClose}
            className="text-xs px-3 py-1.5 rounded-md bg-[#eac840] text-dark font-medium hover:bg-[#d4b435] transition-colors"
          >
            {t("votingCloseVote")}
          </button>
        </div>
      )}
    </div>
  );
};
