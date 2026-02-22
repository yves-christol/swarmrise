import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type CreateLotteryModalProps = {
  channelId: Id<"channels">;
  onClose: () => void;
};

export const CreateLotteryModal = ({ channelId, onClose }: CreateLotteryModalProps) => {
  const { t } = useTranslation("chat");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createLotteryMessage = useMutation(api.chat.functions.createLotteryMessage);

  const canSubmit = description.trim().length > 0 && !isSubmitting;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    void createLotteryMessage({
      channelId,
      description: description.trim(),
    })
      .then(() => onClose())
      .catch((error) => {
        console.error("Failed to create lottery:", error);
        setIsSubmitting(false);
      });
  }, [canSubmit, description, channelId, createLotteryMessage, onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface-primary rounded-lg shadow-xl w-[90vw] max-w-md border border-border-default max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-default shrink-0">
          <h3 className="text-sm font-semibold text-dark dark:text-light">
            {t("lotteryCreate")}
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
          <div>
            <label className="block text-xs font-medium text-text-description mb-1">
              {t("lotteryDescription")}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={t("lotteryDescriptionPlaceholder")}
              autoFocus
              className="w-full text-sm bg-surface-secondary text-dark dark:text-light rounded-md px-3 py-2 placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-default shrink-0">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md bg-surface-tertiary text-dark dark:text-light hover:bg-surface-hover-strong transition-colors"
          >
            {t("lotteryCancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-sm px-3 py-1.5 rounded-md bg-highlight text-dark font-medium hover:bg-highlight-hover disabled:opacity-40 transition-colors"
          >
            {t("lotterySubmit")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
