import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { EmbeddedElection } from "./index";

type DiscussionPhaseProps = {
  messageId: Id<"messages">;
  tool: EmbeddedElection;
};

export const DiscussionPhase = ({ messageId, tool }: DiscussionPhaseProps) => {
  const { t } = useTranslation("chat");
  const [showCandidateSelect, setShowCandidateSelect] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const nominations = useQuery(api.chat.functions.getElectionNominations, { messageId });
  const eligibleNominees = useQuery(api.chat.functions.getEligibleNominees, { messageId });
  const isFacilitator = useQuery(api.chat.functions.canFacilitateElectionQuery, { messageId });

  const advancePhase = useMutation(api.chat.functions.advanceElectionPhase);

  const proposedCandidate = eligibleNominees?.find((m) => m._id === tool.proposedCandidateId);

  const filteredNominees = eligibleNominees?.filter((m) => {
    const name = `${m.firstname} ${m.surname}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const [selectedCandidateId, setSelectedCandidateId] = useState<Id<"members"> | null>(null);

  const handleConfirmCandidate = useCallback(() => {
    if (!selectedCandidateId) return;
    void advancePhase({ messageId, newPhase: "change_round", proposedCandidateId: selectedCandidateId }).then(() => {
      setShowCandidateSelect(false);
      setSearchTerm("");
      setSelectedCandidateId(null);
    });
  }, [messageId, selectedCandidateId, advancePhase]);

  const handleAdvanceToChangeRound = useCallback(() => {
    void advancePhase({ messageId, newPhase: "change_round" });
  }, [messageId, advancePhase]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      {/* Info */}
      <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
        {t("electionDiscussionInfo")}
      </div>

      {/* Revealed nominations */}
      {nominations?.phase === "revealed" && (
        <div className="px-3 pb-2 space-y-2">
          {/* Tally */}
          {nominations.tally.length > 0 && (
            <div>
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

          {/* Detailed nominations */}
          <div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("electionNominations")}
            </div>
            {nominations.nominations.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("electionNoNominations")}</p>
            ) : (
              <div className="space-y-1">
                {nominations.nominations.map((n) => (
                  <div key={n._id} className="text-xs text-dark dark:text-light">
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {n.nominee.firstname} {n.nominee.surname}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {" "}{t("electionNominatedBy", {
                        name: `${n.nominator.firstname} ${n.nominator.surname}`,
                        reason: n.reason,
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Proposed candidate */}
          {proposedCandidate && (
            <div className="flex items-center gap-2 py-1 px-2 bg-purple-50 dark:bg-purple-900/20 rounded">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                {t("electionProposedCandidate")}:
              </span>
              <span className="text-xs text-dark dark:text-light font-medium">
                {proposedCandidate.firstname} {proposedCandidate.surname}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Facilitator controls */}
      {isFacilitator && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
          {/* Propose candidate with search */}
          {!showCandidateSelect ? (
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowCandidateSelect(true)}
                className="text-xs px-3 py-1.5 rounded-md bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
              >
                {t("electionSetCandidate")}
              </button>
              {tool.proposedCandidateId && (
                <button
                  onClick={handleAdvanceToChangeRound}
                  className="text-xs px-3 py-1.5 rounded-md bg-[#eac840] text-dark font-medium hover:bg-[#d4b435] transition-colors"
                >
                  {t("electionAdvanceToChangeRound")}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {t("electionSetCandidate")}
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedCandidateId(null);
                }}
                placeholder={t("electionSearchMembers")}
                className="w-full text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-dark dark:text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#eac840]"
              />
              {searchTerm && filteredNominees && filteredNominees.length > 0 && !selectedCandidateId && (
                <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700">
                  {filteredNominees.map((m) => (
                    <button
                      key={m._id}
                      onClick={() => {
                        setSelectedCandidateId(m._id);
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
              {selectedCandidateId && (
                <button
                  onClick={() => {
                    setSelectedCandidateId(null);
                    setSearchTerm("");
                  }}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {t("electionSelectNominee")}
                </button>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleConfirmCandidate}
                  disabled={!selectedCandidateId}
                  className="text-xs px-3 py-1.5 rounded-md bg-[#eac840] text-dark font-medium hover:bg-[#d4b435] disabled:opacity-40 transition-colors"
                >
                  {t("electionAdvanceToChangeRound")}
                </button>
                <button
                  onClick={() => {
                    setShowCandidateSelect(false);
                    setSearchTerm("");
                    setSelectedCandidateId(null);
                  }}
                  className="text-xs px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-600 text-dark dark:text-light font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
                >
                  {t("electionCancel")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
