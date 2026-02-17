import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type CreateTopicModalProps = {
  channelId: Id<"channels">;
  onClose: () => void;
};

export const CreateTopicModal = ({ channelId, onClose }: CreateTopicModalProps) => {
  const { t } = useTranslation("chat");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTopicMessage = useMutation(api.chat.functions.createTopicMessage);

  const handleSubmit = useCallback(() => {
    if (!title.trim() || !description.trim() || isSubmitting) return;
    setIsSubmitting(true);
    void createTopicMessage({ channelId, title: title.trim(), description: description.trim() })
      .then(() => onClose())
      .catch((error) => {
        console.error("Failed to create topic:", error);
        setIsSubmitting(false);
      });
  }, [title, description, channelId, isSubmitting, createTopicMessage, onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-light dark:bg-dark rounded-lg shadow-xl w-[90vw] max-w-md border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-dark dark:text-light">
            {t("topicCreate")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("topicTitle")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("topicTitlePlaceholder")}
              autoFocus
              className="w-full text-sm bg-slate-100 dark:bg-slate-800 text-dark dark:text-light rounded-md px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("topicDescription")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("topicDescriptionPlaceholder")}
              rows={4}
              className="w-full text-sm bg-slate-100 dark:bg-slate-800 text-dark dark:text-light rounded-md px-3 py-2 resize-none placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-dark dark:text-light hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            {t("topicCancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !description.trim() || isSubmitting}
            className="text-sm px-3 py-1.5 rounded-md bg-highlight text-dark font-medium hover:bg-highlight-hover disabled:opacity-40 transition-colors"
          >
            {t("topicSubmit")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
