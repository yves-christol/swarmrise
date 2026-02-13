import { useState, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type ClarificationPhaseProps = {
  messageId: Id<"messages">;
};

export const ClarificationPhase = ({ messageId }: ClarificationPhaseProps) => {
  const { t } = useTranslation("chat");
  const [question, setQuestion] = useState("");
  const [answerInputs, setAnswerInputs] = useState<Record<string, string>>({});

  const clarifications = useQuery(api.chat.functions.getTopicClarifications, { messageId });
  const isFacilitator = useQuery(api.chat.functions.canFacilitate, { messageId });

  const askClarification = useMutation(api.chat.functions.askClarification);
  const answerClarification = useMutation(api.chat.functions.answerClarification);
  const advanceTopicPhase = useMutation(api.chat.functions.advanceTopicPhase);

  const handleAsk = useCallback(() => {
    const trimmed = question.trim();
    if (!trimmed) return;
    void askClarification({ messageId, question: trimmed }).then(() => setQuestion(""));
  }, [question, messageId, askClarification]);

  const handleAnswer = useCallback((clarificationId: Id<"topicClarifications">) => {
    const answer = answerInputs[clarificationId]?.trim();
    if (!answer) return;
    void answerClarification({ clarificationId, answer }).then(() => {
      setAnswerInputs((prev) => ({ ...prev, [clarificationId]: "" }));
    });
  }, [answerInputs, answerClarification]);

  const handleAdvance = useCallback(() => {
    void advanceTopicPhase({ messageId, newPhase: "consent" });
  }, [messageId, advanceTopicPhase]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-700">
      {/* Info */}
      <div className="px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 italic">
        {t("topicClarificationInfo")}
      </div>

      {/* Clarification Q&A list */}
      <div className="px-3 pb-2 space-y-3">
        {clarifications === undefined ? null : clarifications.length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gray-500">{t("topicNoClarifications")}</p>
        ) : (
          clarifications.map((c) => (
            <div key={c._id} className="space-y-1">
              {/* Question */}
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0">Q:</span>
                <div className="text-xs text-dark dark:text-light">
                  <span className="font-medium">{c.author.firstname} {c.author.surname}</span>
                  {" — "}
                  {c.question}
                </div>
              </div>

              {/* Answers */}
              {c.answers.map((a) => (
                <div key={a._id} className="flex items-start gap-2 ml-4">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 shrink-0">A:</span>
                  <div className="text-xs text-dark dark:text-light">
                    <span className="font-medium">{a.author.firstname} {a.author.surname}</span>
                    {" — "}
                    {a.answer}
                  </div>
                </div>
              ))}

              {/* Answer input */}
              <div className="flex items-center gap-1 ml-4">
                <input
                  type="text"
                  value={answerInputs[c._id] ?? ""}
                  onChange={(e) => setAnswerInputs((prev) => ({ ...prev, [c._id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAnswer(c._id); }}
                  placeholder={t("topicAnswerPlaceholder")}
                  className="flex-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-dark dark:text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#eac840]"
                />
                <button
                  onClick={() => handleAnswer(c._id)}
                  disabled={!answerInputs[c._id]?.trim()}
                  className="text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-600 text-dark dark:text-light hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-40 transition-colors"
                >
                  {t("topicAnswer")}
                </button>
              </div>
            </div>
          ))
        )}

        {/* Ask question input */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
            placeholder={t("topicAskPlaceholder")}
            className="flex-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-dark dark:text-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#eac840]"
          />
          <button
            onClick={handleAsk}
            disabled={!question.trim()}
            className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
          >
            {t("topicAskQuestion")}
          </button>
        </div>
      </div>

      {/* Facilitator controls */}
      {isFacilitator && (
        <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={handleAdvance}
            className="text-xs px-3 py-1.5 rounded-md bg-[#eac840] text-dark font-medium hover:bg-[#d4b435] transition-colors"
          >
            {t("topicAdvanceToConsent")}
          </button>
        </div>
      )}
    </div>
  );
};
