import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { EmbeddedElection } from "./index";

type ChangeRoundPhaseProps = {
  messageId: Id<"messages">;
  tool: EmbeddedElection;
};

export const ChangeRoundPhase = ({ messageId, tool }: ChangeRoundPhaseProps) => {
  const { t } = useTranslation("chat");
  const [isChanging, setIsChanging] = useState(false);
  const [newNomineeId, setNewNomineeId] = useState<Id<"members"> | null>(null);
  const [newReason, setNewReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const nominations = useQuery(api.chat.functions.getElectionNominations, { messageId });
  const myNomination = useQuery(api.chat.functions.getMyElectionNomination, { messageId });
  const eligibleNominees = useQuery(api.chat.functions.getEligibleNominees, { messageId });
  const isFacilitator = useQuery(api.chat.functions.canFacilitateElectionQuery, { messageId });

  const changeNomination = useMutation(api.chat.functions.changeNomination);
  const advancePhase = useMutation(api.chat.functions.advanceElectionPhase);

  const proposedCandidate = eligibleNominees?.find((m) => m._id === tool.proposedCandidateId);

  const filteredNominees = eligibleNominees?.filter((m) => {
    const name = `${m.firstname} ${m.surname}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const handleChange = useCallback(() => {
    if (!newNomineeId || !newReason.trim()) return;
    void changeNomination({
      messageId,
      newNomineeId,
      newReason: newReason.trim(),
    }).then(() => {
      setIsChanging(false);
      setNewNomineeId(null);
      setNewReason("");
      setSearchTerm("");
    });
  }, [messageId, newNomineeId, newReason, changeNomination]);

  const handleAdvance = useCallback(() => {
    void advancePhase({
      messageId,
      newPhase: "consent",
      proposedCandidateId: tool.proposedCandidateId,
    });
  }, [messageId, tool.proposedCandidateId, advancePhase]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      {/* Info */}
      <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
        {t("electionChangeRoundInfo")}
      </div>

      {/* Proposed candidate */}
      {proposedCandidate && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 py-1 px-2 bg-purple-50 dark:bg-purple-900/20 rounded">
            <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
              {t("electionProposedCandidate")}:
            </span>
            <span className="text-xs text-dark dark:text-light font-medium">
              {proposedCandidate.firstname} {proposedCandidate.surname}
            </span>
          </div>
        </div>
      )}

      {/* Current nomination and change form */}
      {myNomination && (
        <div className="px-3 pb-2 space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 italic">
            {t("electionYourNomination")}: {myNomination.nominee.firstname} {myNomination.nominee.surname}
          </div>

          {!isChanging ? (
            <button
              onClick={() => {
                setIsChanging(true);
                setNewNomineeId(myNomination.nomineeId);
                setNewReason(myNomination.reason);
                setSearchTerm(`${myNomination.nominee.firstname} ${myNomination.nominee.surname}`);
              }}
              className="text-xs px-3 py-1.5 rounded-md bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
            >
              {t("electionChangeNomination")}
            </button>
          ) : (
            <div className="space-y-2">
              {/* New nominee selector */}
              <div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setNewNomineeId(null);
                  }}
                  placeholder={t("electionSearchMembers")}
                  className="w-full text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-dark dark:text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-highlight"
                />
                {searchTerm && filteredNominees && filteredNominees.length > 0 && !newNomineeId && (
                  <div className="mt-1 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700">
                    {filteredNominees.map((m) => (
                      <button
                        key={m._id}
                        onClick={() => {
                          setNewNomineeId(m._id);
                          setSearchTerm(`${m.firstname} ${m.surname}`);
                        }}
                        className="w-full text-left px-2 py-1 text-xs text-dark dark:text-light hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-2"
                      >
                        <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-500 flex items-center justify-center overflow-hidden shrink-0">
                          {m.pictureURL ? (
                            <img src={m.pictureURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-medium text-gray-600 dark:text-gray-300">
                              {m.firstname[0]}{m.surname[0]}
                            </span>
                          )}
                        </div>
                        {m.firstname} {m.surname}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* New reason */}
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleChange(); }}
                placeholder={t("electionNominateReasonPlaceholder")}
                className="w-full text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-dark dark:text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-highlight"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={handleChange}
                  disabled={!newNomineeId || !newReason.trim()}
                  className="text-xs px-3 py-1.5 rounded-md bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-40 transition-colors"
                >
                  {t("electionChangeNomination")}
                </button>
                <button
                  onClick={() => setIsChanging(false)}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-600 text-dark dark:text-light font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                >
                  {t("electionKeepNomination")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Updated nominations tally */}
      {nominations?.phase === "revealed" && nominations.tally.length > 0 && (
        <div className="px-3 pb-2">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {t("electionNominationTally")}
          </div>
          <div className="space-y-1">
            {nominations.tally.map((entry) => (
              <div key={entry.memberId} className="flex items-center justify-between text-xs">
                <span className="text-dark dark:text-light font-medium">
                  {entry.firstname} {entry.surname}
                </span>
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  {t("electionNominations_count", { count: entry.count })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facilitator controls */}
      {isFacilitator && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={handleAdvance}
            disabled={!tool.proposedCandidateId}
            className="text-xs px-3 py-1.5 rounded-md bg-highlight text-dark font-medium hover:bg-highlight-hover disabled:opacity-40 transition-colors"
          >
            {t("electionAdvanceToConsent")}
          </button>
        </div>
      )}
    </div>
  );
};
