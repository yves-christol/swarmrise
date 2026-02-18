import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type CreateVotingModalProps = {
  channelId: Id<"channels">;
  onClose: () => void;
};

export const CreateVotingModal = ({ channelId, onClose }: CreateVotingModalProps) => {
  const { t } = useTranslation("chat");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([
    { id: "opt-1", label: "" },
    { id: "opt-2", label: "" },
  ]);
  const [mode, setMode] = useState<"single" | "approval" | "ranked">("single");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createVotingMessage = useMutation(api.chat.functions.createVotingMessage);

  const addOption = useCallback(() => {
    setOptions((prev) => [...prev, { id: `opt-${Date.now()}`, label: "" }]);
  }, []);

  const removeOption = useCallback((index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateOption = useCallback((index: number, label: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, label } : o)));
  }, []);

  const canSubmit = question.trim() && options.length >= 2 && options.every((o) => o.label.trim()) && !isSubmitting;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    const deadlineMs = deadline ? new Date(deadline).getTime() : undefined;

    void createVotingMessage({
      channelId,
      question: question.trim(),
      options: options.map((o) => ({ id: o.id, label: o.label.trim() })),
      mode,
      isAnonymous,
      deadline: deadlineMs,
    })
      .then(() => onClose())
      .catch((error) => {
        console.error("Failed to create voting:", error);
        setIsSubmitting(false);
      });
  }, [canSubmit, question, options, mode, isAnonymous, deadline, channelId, createVotingMessage, onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-light dark:bg-dark rounded-lg shadow-xl w-[90vw] max-w-md border border-border-default max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
          <h3 className="text-sm font-semibold text-dark dark:text-light">
            {t("votingCreate")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface-hover-strong transition-colors text-text-secondary"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto min-h-0 flex-1">
          {/* Question */}
          <div>
            <label className="block text-xs font-medium text-text-description mb-1">
              {t("votingQuestion")}
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t("votingQuestionPlaceholder")}
              autoFocus
              className="w-full text-sm bg-surface-secondary text-dark dark:text-light rounded-md px-3 py-2 placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs font-medium text-text-description mb-1">
              {t("votingOptions")}
            </label>
            <div className="space-y-1.5">
              {options.map((opt, i) => (
                <div key={opt.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`${t("votingOptionPlaceholder")} ${i + 1}`}
                    className="flex-1 text-sm bg-surface-secondary text-dark dark:text-light rounded-md px-3 py-1.5 placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(i)}
                      className="p-1 rounded-md hover:bg-surface-hover-strong text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addOption}
              className="mt-1.5 text-xs text-gold dark:text-highlight hover:underline"
            >
              + {t("votingAddOption")}
            </button>
          </div>

          {/* Mode */}
          <div>
            <label className="block text-xs font-medium text-text-description mb-1">
              {t("votingMode")}
            </label>
            <div className="flex flex-col gap-1">
              {(["single", "approval", "ranked"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm text-dark dark:text-light cursor-pointer">
                  <input
                    type="radio"
                    name="votingMode"
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    className="accent-highlight"
                  />
                  {t(`votingMode_${m}`)}
                </label>
              ))}
            </div>
          </div>

          {/* Anonymous */}
          <label className="flex items-center gap-2 text-sm text-dark dark:text-light cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="accent-highlight"
            />
            {t("votingAnonymous")}
          </label>

          {/* Deadline */}
          <div>
            <label className="block text-xs font-medium text-text-description mb-1">
              {t("votingDeadline")}
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full text-sm bg-surface-secondary text-dark dark:text-light rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-default shrink-0">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md bg-surface-tertiary text-dark dark:text-light hover:bg-surface-hover-strong transition-colors"
          >
            {t("votingCancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-sm px-3 py-1.5 rounded-md bg-highlight text-dark font-medium hover:bg-highlight-hover disabled:opacity-40 transition-colors"
          >
            {t("votingSubmit")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
