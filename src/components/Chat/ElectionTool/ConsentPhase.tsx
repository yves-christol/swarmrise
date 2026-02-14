import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { EmbeddedElection } from "./index";

type ConsentPhaseProps = {
  messageId: Id<"messages">;
  tool: EmbeddedElection;
};

export const ConsentPhase = ({ messageId, tool }: ConsentPhaseProps) => {
  const { t } = useTranslation("chat");
  const [objectionReason, setObjectionReason] = useState("");
  const [showResolve, setShowResolve] = useState(false);

  const responses = useQuery(api.chat.functions.getElectionResponses, { messageId });
  const myResponse = useQuery(api.chat.functions.getMyElectionResponse, { messageId });
  const isFacilitator = useQuery(api.chat.functions.canFacilitateElectionQuery, { messageId });
  const eligibleNominees = useQuery(api.chat.functions.getEligibleNominees, { messageId });

  const submitResponse = useMutation(api.chat.functions.submitElectionResponse);
  const advancePhase = useMutation(api.chat.functions.advanceElectionPhase);
  const resolveElection = useMutation(api.chat.functions.resolveElection);

  const proposedCandidate = eligibleNominees?.find((m) => m._id === tool.proposedCandidateId);

  const consentCount = responses?.filter((r) => r.response === "consent").length ?? 0;
  const objectionCount = responses?.filter((r) => r.response === "objection").length ?? 0;
  const standAsideCount = responses?.filter((r) => r.response === "stand_aside").length ?? 0;

  const handleConsent = useCallback(() => {
    void submitResponse({ messageId, response: "consent" });
  }, [messageId, submitResponse]);

  const handleStandAside = useCallback(() => {
    void submitResponse({ messageId, response: "stand_aside" });
  }, [messageId, submitResponse]);

  const handleObject = useCallback(() => {
    const reason = objectionReason.trim();
    if (!reason) return;
    void submitResponse({ messageId, response: "objection", reason }).then(() => {
      setObjectionReason("");
    });
  }, [messageId, objectionReason, submitResponse]);

  const handleRestart = useCallback(() => {
    void advancePhase({ messageId, newPhase: "nomination" });
  }, [messageId, advancePhase]);

  const handleResolve = useCallback((outcome: "elected" | "no_election") => {
    void resolveElection({
      messageId,
      outcome,
      electedMemberId: outcome === "elected" ? tool.proposedCandidateId : undefined,
    });
    setShowResolve(false);
  }, [messageId, tool.proposedCandidateId, resolveElection]);

  const responseLabel = (response: string) => {
    if (response === "consent") return t("electionConsent");
    if (response === "objection") return t("electionObjection");
    return t("electionStandAside");
  };

  const responseColor = (response: string) => {
    if (response === "consent") return "text-green-600 dark:text-green-400";
    if (response === "objection") return "text-red-600 dark:text-red-400";
    return "text-gray-500 dark:text-gray-400";
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      {/* Info */}
      <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
        {t("electionConsentInfo")}
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

      {/* Response tally */}
      <div className="px-3 pb-2 flex items-center gap-3">
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          {t("electionConsent")}: {consentCount}
        </span>
        <span className="text-xs font-medium text-red-600 dark:text-red-400">
          {t("electionObjection")}: {objectionCount}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {t("electionStandAside")}: {standAsideCount}
        </span>
      </div>

      {/* Response list */}
      {responses && responses.length > 0 && (
        <div className="px-3 pb-2 space-y-1">
          {responses.map((r) => (
            <div key={r._id} className="flex items-start gap-2 text-xs">
              <span className={`font-medium shrink-0 ${responseColor(r.response)}`}>
                {responseLabel(r.response)}
              </span>
              <span className="text-dark dark:text-light">
                {r.member.firstname} {r.member.surname}
                {r.reason && (
                  <span className="text-gray-500 dark:text-gray-400"> -- {r.reason}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {responses && responses.length === 0 && (
        <div className="px-3 pb-2">
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("electionNoResponses")}</p>
        </div>
      )}

      {/* Current user's response indicator */}
      {myResponse && (
        <div className="px-3 pb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 italic">
            {t("electionYourResponse")}: {responseLabel(myResponse.response)}
          </span>
        </div>
      )}

      {/* Response buttons (hidden if already responded) */}
      {!myResponse && (
        <div className="px-3 pb-2 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleConsent}
              className="text-xs px-3 py-1.5 rounded-md bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
            >
              {t("electionConsent")}
            </button>
            <button
              onClick={handleStandAside}
              className="text-xs px-3 py-1.5 rounded-md bg-slate-300 dark:bg-slate-600 text-dark dark:text-light font-medium hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors"
            >
              {t("electionStandAside")}
            </button>
          </div>

          {/* Objection with reason */}
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={objectionReason}
              onChange={(e) => setObjectionReason(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleObject(); }}
              placeholder={t("electionObjectionPlaceholder")}
              className="flex-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-dark dark:text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <button
              onClick={handleObject}
              disabled={!objectionReason.trim()}
              className="text-xs px-3 py-1 rounded-md bg-red-500 text-white font-medium hover:bg-red-600 disabled:opacity-40 transition-colors"
            >
              {t("electionObjection")}
            </button>
          </div>
        </div>
      )}

      {/* Facilitator controls */}
      {isFacilitator && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 justify-end">
          <button
            onClick={handleRestart}
            className="text-xs px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-600 text-dark dark:text-light font-medium hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors"
          >
            {t("electionRestartElection")}
          </button>

          {!showResolve ? (
            <button
              onClick={() => setShowResolve(true)}
              className="text-xs px-3 py-1.5 rounded-md bg-[#eac840] text-dark font-medium hover:bg-[#d4b435] transition-colors"
            >
              {t("electionResolve")}
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleResolve("elected")}
                className="text-xs px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
              >
                {t("electionOutcomeElected")}
              </button>
              <button
                onClick={() => handleResolve("no_election")}
                className="text-xs px-2 py-1 rounded bg-gray-400 text-white hover:bg-gray-500 transition-colors"
              >
                {t("electionOutcomeNoElection")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
