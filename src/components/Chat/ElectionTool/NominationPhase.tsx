import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type NominationPhaseProps = {
  messageId: Id<"messages">;
};

export const NominationPhase = ({ messageId }: NominationPhaseProps) => {
  const { t } = useTranslation("chat");
  const [selectedNominee, setSelectedNominee] = useState<Id<"members"> | null>(null);
  const [reason, setReason] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const nominations = useQuery(api.chat.functions.getElectionNominations, { messageId });
  const myNomination = useQuery(api.chat.functions.getMyElectionNomination, { messageId });
  const eligibleNominees = useQuery(api.chat.functions.getEligibleNominees, { messageId });
  const isFacilitator = useQuery(api.chat.functions.canFacilitateElectionQuery, { messageId });

  const submitNomination = useMutation(api.chat.functions.submitNomination);
  const advancePhase = useMutation(api.chat.functions.advanceElectionPhase);

  const hasNominated = nominations?.phase === "secret" ? nominations.hasNominated : !!myNomination;

  const filteredNominees = eligibleNominees?.filter((m) => {
    const name = `${m.firstname} ${m.surname}`.toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  const handleSubmit = useCallback(() => {
    if (!selectedNominee || !reason.trim()) return;
    void submitNomination({
      messageId,
      nomineeId: selectedNominee,
      reason: reason.trim(),
    }).then(() => {
      setSelectedNominee(null);
      setReason("");
      setSearchTerm("");
    });
  }, [messageId, selectedNominee, reason, submitNomination]);

  const handleAdvance = useCallback(() => {
    void advancePhase({ messageId, newPhase: "discussion" });
  }, [messageId, advancePhase]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      {/* Info */}
      <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
        {t("electionNominationInfo")}
      </div>

      {/* Nomination count (secret mode) */}
      {nominations?.phase === "secret" && (
        <div className="px-3 pb-2">
          <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
            {t("electionNominationCount", { count: nominations.totalNominations })}
          </span>
        </div>
      )}

      {/* Already nominated indicator */}
      {hasNominated && myNomination && (
        <div className="px-3 pb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
            {t("electionYourNomination")}: {myNomination.nominee.firstname} {myNomination.nominee.surname}
          </span>
        </div>
      )}

      {hasNominated && !myNomination && nominations?.phase === "secret" && (
        <div className="px-3 pb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
            {t("electionNominatedAlready")}
          </span>
        </div>
      )}

      {/* Nomination form (hidden if already nominated) */}
      {!hasNominated && (
        <div className="px-3 pb-2 space-y-2">
          {/* Nominee selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("electionNominateLabel")}
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("electionSearchMembers")}
              className="w-full text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-dark dark:text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-highlight"
            />
            {searchTerm && filteredNominees && filteredNominees.length > 0 && !selectedNominee && (
              <div className="mt-1 max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700">
                {filteredNominees.map((m) => (
                  <button
                    key={m._id}
                    onClick={() => {
                      setSelectedNominee(m._id);
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
            {selectedNominee && (
              <button
                onClick={() => {
                  setSelectedNominee(null);
                  setSearchTerm("");
                }}
                className="mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {t("electionSelectNominee")}
              </button>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("electionNominateReason")}
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              placeholder={t("electionNominateReasonPlaceholder")}
              className="w-full text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-dark dark:text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-highlight"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!selectedNominee || !reason.trim()}
            className="text-xs px-3 py-1.5 rounded-md bg-purple-500 text-white font-medium hover:bg-purple-600 disabled:opacity-40 transition-colors"
          >
            {t("electionNominateSubmit")}
          </button>
        </div>
      )}

      {/* Facilitator controls */}
      {isFacilitator && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={handleAdvance}
            className="text-xs px-3 py-1.5 rounded-md bg-highlight text-dark font-medium hover:bg-highlight-hover transition-colors"
          >
            {t("electionAdvanceToDiscussion")}
          </button>
        </div>
      )}
    </div>
  );
};
