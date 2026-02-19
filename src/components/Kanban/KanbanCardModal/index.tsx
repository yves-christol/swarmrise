import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import type { KanbanCard, KanbanLabel, ChecklistItem, Priority } from "../../../../convex/kanban";
import type { KanbanColumn } from "../../../../convex/kanban";
import type { Member } from "../../../../convex/members";
import type { Role } from "../../../../convex/roles";
import { LABEL_COLORS, MAX_ATTACHMENT_SIZE, priorityValues } from "../../../../convex/kanban";

/** Maps label color keys to Tailwind classes */
const LABEL_BG_CLASSES: Record<string, string> = {
  red: "bg-red-500", orange: "bg-orange-500", amber: "bg-amber-500",
  green: "bg-green-500", teal: "bg-teal-500", blue: "bg-blue-500",
  indigo: "bg-indigo-500", purple: "bg-purple-500", pink: "bg-pink-500",
  gray: "bg-gray-500",
};

const PRIORITY_DOT: Record<Priority, string> = {
  low: "bg-blue-400", medium: "bg-amber-400", high: "bg-orange-500", critical: "bg-red-600",
};

type KanbanCardModalProps = {
  isOpen: boolean;
  onClose: () => void;
  boardId: Id<"kanbanBoards">;
  columns: KanbanColumn[];
  roles: Role[];
  memberMap: Map<Id<"members">, Member>;
  columnId?: Id<"kanbanColumns">;
  card?: KanbanCard;
  labels: KanbanLabel[];
  allCards: KanbanCard[];
  templateLabelId: Id<"kanbanLabels"> | null;
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
  labels,
  allCards,
  templateLabelId,
}: KanbanCardModalProps) {
  const { t } = useTranslation("kanban");

  const createCard = useMutation(api.kanban.functions.createCard);
  const updateCard = useMutation(api.kanban.functions.updateCard);
  const deleteCard = useMutation(api.kanban.functions.deleteCard);
  // B1
  const createLabelMut = useMutation(api.kanban.functions.createLabel);
  // B3
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const addAttachmentMut = useMutation(api.kanban.functions.addAttachment);
  const deleteAttachmentMut = useMutation(api.kanban.functions.deleteAttachment);
  // B4
  const addCommentMut = useMutation(api.kanban.functions.addComment);
  const deleteCommentMut = useMutation(api.kanban.functions.deleteComment);
  // B3/B4: Fetch attachments (with download URLs) and comments for the card being edited
  const attachments = useQuery(
    api.kanban.functions.getAttachmentsForCardWithUrls,
    card ? { cardId: card._id } : "skip",
  );
  const comments = useQuery(
    api.kanban.functions.getCommentsForCard,
    card ? { cardId: card._id } : "skip",
  );

  const isEditMode = !!card;

  // Form state
  const [title, setTitle] = useState("");
  const [roleId, setRoleId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [cardComments, setCardComments] = useState("");
  const [selectedColumnId, setSelectedColumnId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // B1: Label state
  const [selectedLabelIds, setSelectedLabelIds] = useState<Id<"kanbanLabels">[]>([]);
  const [showLabelCreator, setShowLabelCreator] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("blue");

  // B2: Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // B6: Priority state
  const [priority, setPriority] = useState<Priority | "">("");

  // B4: New comment text
  const [newComment, setNewComment] = useState("");

  // B3: File upload
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sort roles alphabetically by title
  const sortedRoles = useMemo(() => {
    return [...roles].sort((a, b) => a.title.localeCompare(b.title));
  }, [roles]);

  // B5: Derive template cards -- cards that have the template label attached
  const templateCards = useMemo(() => {
    if (!templateLabelId) return [];
    return allCards.filter(
      (c) => c.labelIds?.includes(templateLabelId),
    );
  }, [allCards, templateLabelId]);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (card) {
        setTitle(card.title);
        setRoleId(card.roleId);
        setDueDate(timestampToDateString(card.dueDate));
        setCardComments(card.comments);
        setSelectedColumnId(card.columnId);
        setSelectedLabelIds(card.labelIds ?? []);
        setChecklist(card.checklist ?? []);
        setPriority(card.priority ?? "");
      } else {
        setTitle("");
        setRoleId(roles[0]?._id ?? "");
        setDueDate(todayString());
        setCardComments("");
        setSelectedColumnId(columnId ?? columns[0]?._id ?? "");
        setSelectedLabelIds([]);
        setChecklist([]);
        setPriority("");
      }
      setError(null);
      setShowDeleteConfirm(false);
      setShowLabelCreator(false);
      setNewComment("");
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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // B5: Apply template -- copy fields from a template card into the form
  const handleApplyTemplate = useCallback((templateCard: KanbanCard) => {
    setTitle(templateCard.title);
    if (templateCard.comments) setCardComments(templateCard.comments);
    if (templateCard.priority) setPriority(templateCard.priority);
    // Copy labels from template card, but exclude the "template" label itself
    if (templateCard.labelIds) {
      setSelectedLabelIds(
        templateCard.labelIds.filter((id) => id !== templateLabelId),
      );
    }
    if (templateCard.checklist) {
      setChecklist(templateCard.checklist.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        completed: false,
      })));
    }
  }, [templateLabelId]);

  // B2: Checklist helpers
  const handleAddChecklistItem = useCallback(() => {
    const text = newChecklistItem.trim();
    if (!text) return;
    setChecklist((prev) => [...prev, { id: crypto.randomUUID(), text, completed: false }]);
    setNewChecklistItem("");
  }, [newChecklistItem]);

  const handleToggleChecklistItem = useCallback((itemId: string) => {
    setChecklist((prev) =>
      prev.map((item) => item.id === itemId ? { ...item, completed: !item.completed } : item),
    );
  }, []);

  const handleRemoveChecklistItem = useCallback((itemId: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // B1: Label helpers
  const toggleLabel = useCallback((labelId: Id<"kanbanLabels">) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    );
  }, []);

  const handleCreateLabel = useCallback(async () => {
    const name = newLabelName.trim();
    if (!name) return;
    try {
      const labelId = await createLabelMut({ boardId, name, color: newLabelColor });
      setSelectedLabelIds((prev) => [...prev, labelId]);
      setNewLabelName("");
      setShowLabelCreator(false);
    } catch { /* handled by Convex */ }
  }, [newLabelName, newLabelColor, boardId, createLabelMut]);

  // B3: File upload handler
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !card) return;

    if (file.size > MAX_ATTACHMENT_SIZE) {
      setError(t("attachments.fileTooLarge"));
      return;
    }

    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await addAttachmentMut({
        cardId: card._id,
        storageId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("card.genericError"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [card, generateUploadUrl, addAttachmentMut, t]);

  // B4: Add comment
  const handleAddComment = useCallback(async () => {
    const text = newComment.trim();
    if (!text || !card) return;
    try {
      await addCommentMut({ cardId: card._id, text });
      setNewComment("");
    } catch { /* handled by Convex */ }
  }, [newComment, card, addCommentMut]);

  const validate = (): boolean => {
    if (!title.trim()) { setError(t("card.titleRequired")); return false; }
    if (!roleId) { setError(t("card.roleRequired")); return false; }
    if (!dueDate) { setError(t("card.dueDateRequired")); return false; }
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
          comments: cardComments.trim(),
          labelIds: selectedLabelIds,
          checklist: checklist,
          priority: priority ? priority : undefined,
        });
      } else {
        await createCard({
          boardId,
          columnId: selectedColumnId as Id<"kanbanColumns">,
          title: title.trim(),
          roleId: roleId as Id<"roles">,
          dueDate: dueDateTimestamp,
          comments: cardComments.trim() || undefined,
          labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
          checklist: checklist.length > 0 ? checklist : undefined,
          priority: priority ? priority : undefined,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("card.genericError"));
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
      setError(err instanceof Error ? err.message : t("card.genericError"));
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
        className={`w-full max-w-lg mx-4 bg-surface-primary border-2 border-border-strong rounded-lg shadow-xl
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

        {/* B5: Template selector (create mode only) -- pick from cards with "template" label */}
        {!isEditMode && templateCards.length > 0 && (
          <div className="px-6 pt-3">
            <select
              onChange={(e) => {
                const tmplCard = templateCards.find((c) => c._id === e.target.value);
                if (tmplCard) handleApplyTemplate(tmplCard);
                e.target.value = "";
              }}
              defaultValue=""
              className="w-full px-3 py-1.5 text-sm rounded-md border border-border-strong
                bg-surface-primary text-dark dark:text-light
                focus:outline-none focus:ring-2 focus:ring-highlight"
            >
              <option value="" disabled>{t("templates.fromTemplate")}</option>
              {templateCards.map((tmplCard) => (
                <option key={tmplCard._id} value={tmplCard._id}>{tmplCard.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4">
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
              onChange={(e) => { setTitle(e.target.value); if (error) setError(null); }}
              disabled={isSubmitting}
              className={`px-3 py-2 text-sm rounded-md border bg-surface-primary text-dark dark:text-light
                placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error && !title.trim() ? "border-red-400" : "border-border-strong"}`}
            />
          </div>

          {/* Column (create mode only) */}
          {!isEditMode && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="card-column" className="text-sm font-bold text-dark dark:text-light">
                {t("card.column")}
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

          {/* Role + Due date row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Role */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="card-role" className="text-sm font-bold text-dark dark:text-light">
                {t("card.role")}
              </label>
              <select
                id="card-role"
                value={roleId}
                onChange={(e) => { setRoleId(e.target.value); if (error) setError(null); }}
                disabled={isSubmitting}
                className="px-3 py-2 text-sm rounded-md border border-border-strong
                  bg-surface-primary text-dark dark:text-light
                  focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="" disabled>{t("card.selectRole")}</option>
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
                onChange={(e) => { setDueDate(e.target.value); if (error) setError(null); }}
                disabled={isSubmitting}
                className="px-3 py-2 text-sm rounded-md border border-border-strong
                  bg-surface-primary text-dark dark:text-light
                  focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* B6: Priority */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-priority" className="text-sm font-bold text-dark dark:text-light">
              {t("priority.title")}
            </label>
            <div className="flex items-center gap-1.5">
              {(["", ...priorityValues] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition-colors
                    ${priority === p
                      ? "border-highlight bg-highlight/10 text-dark dark:text-light font-medium"
                      : "border-border-default text-text-secondary hover:border-border-strong hover:text-text-primary"
                    }`}
                >
                  {p ? (
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[p]}`} />
                      {t(`priority.${p}`)}
                    </span>
                  ) : (
                    t("priority.none")
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* B1: Labels */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-dark dark:text-light">{t("labels.title")}</span>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => {
                const isSelected = selectedLabelIds.includes(label._id);
                return (
                  <button
                    key={label._id}
                    type="button"
                    onClick={() => toggleLabel(label._id)}
                    className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border transition-colors
                      ${isSelected
                        ? "border-highlight bg-highlight/10 font-medium"
                        : "border-border-default hover:border-border-strong"
                      }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${LABEL_BG_CLASSES[label.color] ?? "bg-gray-500"}`} />
                    <span className="text-dark dark:text-light">{label.name}</span>
                  </button>
                );
              })}

              {/* Create new label inline */}
              {showLabelCreator ? (
                <div className="flex items-center gap-1">
                  <select
                    value={newLabelColor}
                    onChange={(e) => setNewLabelColor(e.target.value)}
                    className="w-16 px-1 py-0.5 text-xs rounded border border-border-strong bg-surface-primary text-dark dark:text-light"
                  >
                    {LABEL_COLORS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreateLabel(); } if (e.key === "Escape") setShowLabelCreator(false); }}
                    placeholder={t("labels.name")}
                    className="w-24 px-2 py-0.5 text-xs rounded border border-border-strong bg-surface-primary text-dark dark:text-light focus:outline-none focus:ring-1 focus:ring-highlight"
                    autoFocus
                  />
                  <button type="button" onClick={() => void handleCreateLabel()} className="text-xs text-highlight font-medium">{t("actions.save")}</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLabelCreator(true)}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border border-dashed border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M5 1v8M1 5h8" />
                  </svg>
                  {t("labels.createNew")}
                </button>
              )}
            </div>
          </div>

          {/* B2: Checklist */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold text-dark dark:text-light">{t("checklist.title")}</span>

            {/* Progress bar */}
            {checklist.length > 0 && (
              <div className="flex items-center gap-2 mb-1">
                <div className="flex-1 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      checklist.filter((i) => i.completed).length === checklist.length ? "bg-green-500" : "bg-highlight"
                    }`}
                    style={{ width: `${(checklist.filter((i) => i.completed).length / checklist.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-text-tertiary tabular-nums">
                  {t("checklist.progress", {
                    completed: checklist.filter((i) => i.completed).length,
                    total: checklist.length,
                  })}
                </span>
              </div>
            )}

            {/* Checklist items */}
            <div className="space-y-1">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleChecklistItem(item.id)}
                    className="w-3.5 h-3.5 rounded border-border-strong accent-highlight"
                  />
                  <span className={`text-sm flex-1 ${item.completed ? "line-through text-text-tertiary" : "text-dark dark:text-light"}`}>
                    {item.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklistItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-text-tertiary hover:text-red-500 transition-opacity"
                    title={t("checklist.removeItem")}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add new item */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddChecklistItem(); } }}
                placeholder={t("checklist.placeholder")}
                className="flex-1 px-2 py-1 text-sm rounded border border-border-default bg-surface-primary text-dark dark:text-light placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-highlight"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                disabled={!newChecklistItem.trim()}
                className="px-2 py-1 text-xs text-highlight font-medium disabled:opacity-30"
              >
                {t("checklist.addItem")}
              </button>
            </div>
          </div>

          {/* Description (legacy text field, formerly "comments") */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="card-comments" className="text-sm font-bold text-dark dark:text-light">
              {t("card.description")}
            </label>
            <textarea
              id="card-comments"
              value={cardComments}
              onChange={(e) => setCardComments(e.target.value)}
              rows={2}
              disabled={isSubmitting}
              className="px-3 py-2 text-sm rounded-md border border-border-strong
                bg-surface-primary text-dark dark:text-light placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-highlight transition-colors resize-none
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* B3: Attachments (edit mode only) */}
          {isEditMode && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-dark dark:text-light">{t("attachments.title")}</span>
              {attachments && attachments.length > 0 && (
                <div className="space-y-1">
                  {attachments.map((att) => (
                    <div key={att._id} className="flex items-center gap-2 text-sm group">
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-text-tertiary flex-shrink-0" aria-hidden="true">
                        <path fillRule="evenodd" d="M15.621 4.379a3 3 0 00-4.242 0l-7 7a3 3 0 004.241 4.243h.001l.497-.5a.75.75 0 011.064 1.057l-.498.501-.002.002a4.5 4.5 0 01-6.364-6.364l7-7a4.5 4.5 0 016.368 6.36l-3.455 3.553A2.625 2.625 0 119.52 9.52l3.45-3.451a.75.75 0 111.061 1.06l-3.45 3.451a1.125 1.125 0 001.587 1.595l3.454-3.553a3 3 0 000-4.242z" clipRule="evenodd" />
                      </svg>
                      {att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-highlight hover:underline truncate flex-1"
                          title={t("attachments.download")}
                        >
                          {att.fileName}
                        </a>
                      ) : (
                        <span className="text-dark dark:text-light truncate flex-1">{att.fileName}</span>
                      )}
                      <span className="text-xs text-text-tertiary">{formatFileSize(att.fileSize)}</span>
                      <button
                        type="button"
                        onClick={() => void deleteAttachmentMut({ attachmentId: att._id })}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-text-tertiary hover:text-red-500 transition-opacity"
                        title={t("attachments.delete")}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                          <path d="M3 3l6 6M9 3l-6 6" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => void handleFileUpload(e)}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary border border-dashed border-border-default hover:border-border-strong rounded-md transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t("attachments.uploading")}
                    </>
                  ) : (
                    <>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M6 1v10M1 6h10" />
                      </svg>
                      {t("attachments.add")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* B4: Threaded Comments (edit mode only) */}
          {isEditMode && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-dark dark:text-light">
                {t("threadedComments.title")}
                {comments && comments.length > 0 && (
                  <span className="ml-1 font-normal text-text-tertiary">({comments.length})</span>
                )}
              </span>

              {/* Existing comments */}
              {comments && comments.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comments.map((comment) => {
                    const author = memberMap.get(comment.authorId);
                    return (
                      <div key={comment._id} className="flex gap-2 group">
                        <div className="w-5 h-5 rounded-full overflow-hidden bg-surface-tertiary flex-shrink-0 mt-0.5">
                          {author?.pictureURL ? (
                            <img src={author.pictureURL} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-medium text-text-secondary">
                              {author ? `${author.firstname.charAt(0)}${author.surname.charAt(0)}` : "?"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-dark dark:text-light">
                              {author ? `${author.firstname} ${author.surname}` : "Unknown"}
                            </span>
                            <span className="text-[10px] text-text-tertiary">
                              {new Date(comment._creationTime).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <button
                              type="button"
                              onClick={() => void deleteCommentMut({ commentId: comment._id })}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-text-tertiary hover:text-red-500 transition-opacity ml-auto"
                              title={t("threadedComments.delete")}
                            >
                              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                                <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" />
                              </svg>
                            </button>
                          </div>
                          <p className="text-sm text-dark dark:text-light whitespace-pre-wrap">{comment.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New comment input */}
              <div className="flex items-start gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={t("threadedComments.placeholder")}
                  rows={2}
                  className="flex-1 px-2.5 py-1.5 text-sm rounded-md border border-border-default
                    bg-surface-primary text-dark dark:text-light placeholder:text-gray-400
                    focus:outline-none focus:ring-1 focus:ring-highlight resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void handleAddComment();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleAddComment()}
                  disabled={!newComment.trim()}
                  className="px-2.5 py-1.5 text-xs font-medium text-highlight disabled:opacity-30 flex-shrink-0"
                >
                  {t("threadedComments.add")}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400" role="alert">
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
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
            {/* Left: delete */}
            <div className="flex items-center gap-2">
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
                className="px-4 py-2 text-sm text-text-secondary hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
