import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { KanbanCard } from "../../../../convex/kanban";
import type { KanbanColumn } from "../../../../convex/kanban";
import type { Member } from "../../../../convex/members";
import type { Role } from "../../../../convex/roles";
import { getRoleIconPath } from "../../../utils/roleIconDefaults";

type KanbanCardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  boardId: Id<"kanbanBoards">;
  columns: KanbanColumn[];
  roles: Role[];
  memberMap: Map<Id<"members">, Member>;
  columnId?: Id<"kanbanColumns">;
  card?: KanbanCard;
};

export function KanbanCardModal({
  isOpen,
  onClose,
  boardId,
  columns,
  roles,
  memberMap,
  columnId,
  card,
}: KanbanCardModalProps) {
  const { t } = useTranslation("kanban");

  const createCard = useMutation(api.kanban.functions.createCard);
  const updateCard = useMutation(api.kanban.functions.updateCard);
  const deleteCard = useMutation(api.kanban.functions.deleteCard);

  const isEditMode = !!card;

  // Form state
  const [title, setTitle] = useState("");
  const [roleId, setRoleId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [comments, setComments] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sort roles alphabetically by title
  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => a.title.localeCompare(b.title));
  }, [roles]);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (card) {
        setTitle(card.title);
        setRoleId(card.roleId);
        setDueDate(timestampToDateString(card.dueDate));
        setComments(card.comments);
        setSelectedColumnId(card.columnId);
      } else {
        setTitle("");
        setRoleId(roles[0]?._id ?? "");
        setDueDate(todayString());
        setComments("");
        setSelectedColumnId(columnId ?? columns[0]?._id ?? "");
      }
      setError(null);
      setShowDeleteConfirm(false);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen, card, columnId, columns, roles]);

  // Focus title input when modal opens
  useEffect(() => {
    if (isOpen && isVisible) {
      const timer = setTimeout(() => titleInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      setError(t("card.titleRequired"));
      return false;
    }
    if (!roleId) {
      setError(t("card.roleRequired"));
      return false;
    }
    if (!dueDate) {
      setError(t("card.dueDateRequired"));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const dueDateTimestamp = new Date(dueDate + "T23:59:59").getTime();

      if (isEditMode && card) {
        await updateCard({
          cardId: card._id,
          title: title.trim(),
          roleId: roleId as Id<"roles">,
          dueDate: dueDateTimestamp,
          comments: comments.trim(),
        });
      } else {
        await createCard({
          boardId,
          columnId: selectedColumnId as Id<"kanbanColumns">,
          title: title.trim(),
          roleId: roleId as Id<"roles">,
          dueDate: dueDateTimestamp,
          comments: comments.trim() || undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!card) return;
    setIsSubmitting(true);
    try {
      await deleteCard({ cardId: card._id });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
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
        aria-labelledby="kanban-card-modal-title"
        className={`w-full max-w-md mx-4 bg-surface-primary border-2 border-border-strong rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] flex flex-col
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2
            id="kanban-card-modal-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {isEditMode ? t("card.edit") : t("card.create")}
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

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-title" className="text-sm font-bold text-dark dark:text-light">
              {t("card.title")}
            </label>
            <input
              id="card-title"
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              disabled={isSubmitting}
              className={`px-3 py-2 text-sm rounded-md border bg-surface-primary text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error && !title.trim() ? "border-red-400" : "border-border-strong"}`}
            />
          </div>

          {/* Column (create mode only) */}
          {!isEditMode && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="card-column" className="text-sm font-bold text-dark dark:text-light">
                Column
              </label>
              <select
                id="card-column"
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
                disabled={isSubmitting}
                className="px-3 py-2 text-sm rounded-md border border-border-strong
                  bg-surface-primary text-dark dark:text-light
                  focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {columns.map((col) => (
                  <option key={col._id} value={col._id}>{col.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-role" className="text-sm font-bold text-dark dark:text-light">
              {t("card.role")}
            </label>
            <select
              id="card-role"
              value={roleId}
              onChange={(e) => {
                setRoleId(e.target.value);
                if (error) setError(null);
              }}
              disabled={isSubmitting}
              className="px-3 py-2 text-sm rounded-md border border-border-strong
                bg-surface-primary text-dark dark:text-light
                focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>{t("card.roleRequired")}</option>
              {sortedRoles.map((r) => {
                const holder = memberMap.get(r.memberId);
                const holderName = holder ? `${holder.firstname} ${holder.surname}` : "";
                return (
                  <option key={r._id} value={r._id}>
                    {r.title}{holderName ? ` (${holderName})` : ""}
                  </option>
                );
              })}
            </select>

            {/* Preview of selected role */}
            {roleId && (() => {
              const selectedRole = roles.find((r) => r._id === roleId);
              const holder = selectedRole ? memberMap.get(selectedRole.memberId) : undefined;
              if (!selectedRole) return null;
              return (
                <div className="flex items-center gap-2 mt-1 text-xs text-text-secondary">
                  <svg
                    className="w-4 h-4 flex-shrink-0"
                    viewBox="0 0 40 40"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={getRoleIconPath(selectedRole.iconKey, selectedRole.roleType)} />
                  </svg>
                  {holder && (
                    <>
                      <div className="w-4 h-4 rounded-full overflow-hidden bg-surface-tertiary flex-shrink-0">
                        {holder.pictureURL ? (
                          <img
                            src={holder.pictureURL}
                            alt={`${holder.firstname} ${holder.surname}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-medium">
                            {holder.firstname.charAt(0)}{holder.surname.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span>{holder.firstname} {holder.surname}</span>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Due date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-due-date" className="text-sm font-bold text-dark dark:text-light">
              {t("card.dueDate")}
            </label>
            <input
              id="card-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (error) setError(null);
              }}
              disabled={isSubmitting}
              className="px-3 py-2 text-sm rounded-md border border-border-strong
                bg-surface-primary text-dark dark:text-light
                focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Comments */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-comments" className="text-sm font-bold text-dark dark:text-light">
              {t("card.comments")}
            </label>
            <textarea
              id="card-comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={3}
              disabled={isSubmitting}
              className="px-3 py-2 text-sm rounded-md border border-border-strong
                bg-surface-primary text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                resize-none
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400" role="alert">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </p>
          )}

          {/* Delete confirmation */}
          {isEditMode && showDeleteConfirm && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {t("card.deleteConfirm")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50"
                >
                  {t("card.delete")}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-sm text-text-description hover:text-gray-800 dark:hover:text-gray-200"
                >
                  {t("actions.cancel")}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            {/* Left: delete button (edit mode only) */}
            <div>
              {isEditMode && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  {t("card.delete")}
                </button>
              )}
            </div>

            {/* Right: cancel + save */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-text-secondary hover:text-gray-700  dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                {t("actions.cancel")}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !roleId || !dueDate}
                className="
                  px-5 py-2 text-sm font-bold rounded-md
                  bg-highlight hover:bg-highlight-hover text-dark
                  transition-colors duration-75
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-1.5
                "
              >
                {isSubmitting ? (
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
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// Helpers

function todayString(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function timestampToDateString(ts: number): string {
  const d = new Date(ts);
  return d.toISOString().split("T")[0];
}
