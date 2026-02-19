import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { KanbanColumn } from "../../../../convex/kanban";

type KanbanBoardSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  columns: KanbanColumn[];
};

export function KanbanBoardSettings({
  isOpen,
  onClose,
  columns,
}: KanbanBoardSettingsProps) {
  const { t } = useTranslation("kanban");
  const setColumnWipLimit = useMutation(api.kanban.functions.setColumnWipLimit);

  const [isVisible, setIsVisible] = useState(false);
  const [wipLimits, setWipLimits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize WIP limits from column data when modal opens
  useEffect(() => {
    if (isOpen) {
      const limits: Record<string, string> = {};
      for (const col of columns) {
        limits[col._id] = col.wipLimit !== undefined ? String(col.wipLimit) : "";
      }
      setWipLimits(limits);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen, columns]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const col of columns) {
        const rawValue = wipLimits[col._id]?.trim();
        const newLimit = rawValue ? parseInt(rawValue, 10) : null;
        const currentLimit = col.wipLimit ?? null;

        // Only update if changed
        if (newLimit !== currentLimit) {
          await setColumnWipLimit({
            columnId: col._id,
            wipLimit: (newLimit && newLimit > 0) ? newLimit : null,
          });
        }
      }
      onClose();
    } catch {
      // Errors handled by Convex
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-colors duration-150
        ${isVisible ? "bg-black/50" : "bg-black/0"}`}
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kanban-settings-title"
        className={`w-full max-w-md mx-4 bg-surface-primary border-2 border-border-strong rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] flex flex-col
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <h2
            id="kanban-settings-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {t("settings.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={t("actions.close")}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* WIP Limits section */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-2">
          <h3 className="text-sm font-bold text-dark dark:text-light mb-3">
            {t("settings.wipLimits")}
          </h3>
          <p className="text-xs text-text-secondary mb-4">
            {t("settings.wipDescription")}
          </p>

          <div className="space-y-3">
            {columns.map((col) => (
              <div key={col._id} className="flex items-center justify-between gap-3">
                <label
                  htmlFor={`wip-${col._id}`}
                  className="text-sm text-dark dark:text-light truncate flex-1"
                >
                  {col.name}
                </label>
                <input
                  id={`wip-${col._id}`}
                  type="number"
                  min="0"
                  value={wipLimits[col._id] ?? ""}
                  onChange={(e) =>
                    setWipLimits((prev) => ({
                      ...prev,
                      [col._id]: e.target.value,
                    }))
                  }
                  placeholder={t("settings.noLimit")}
                  className="w-20 px-2 py-1.5 text-sm text-center rounded-md border border-border-strong
                    bg-surface-primary text-dark dark:text-light
                    placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-highlight transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-border-default">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-text-secondary hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            {t("actions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="
              px-5 py-2 text-sm font-bold rounded-md
              bg-highlight hover:bg-highlight-hover text-dark
              transition-colors duration-75
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-1.5
            "
          >
            {saving ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                ...
              </>
            ) : (
              t("actions.save")
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
