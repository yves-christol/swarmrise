import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useMembers } from "../../tools/orgaStore";

type CreateRoleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  teamId: Id<"teams">;
};

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

export function CreateRoleModal({ isOpen, onClose, teamId }: CreateRoleModalProps) {
  const { t } = useTranslation("teams");
  const { t: tCommon } = useTranslation("common");

  const createRole = useMutation(api.roles.functions.createRole);
  const { data: members } = useMembers();

  // Form state
  const [name, setName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [mission, setMission] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Sort members alphabetically
  const sortedMembers = useMemo(() => {
    if (!members) return [];
    return [...members].sort((a, b) =>
      `${a.firstname} ${a.surname}`.localeCompare(`${b.firstname} ${b.surname}`)
    );
  }, [members]);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setName("");
        setMemberId("");
        setMission("");
        setIsSubmitting(false);
        setError(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus the name input when modal opens
  useEffect(() => {
    if (isOpen && isVisible) {
      const timer = setTimeout(() => nameInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  // Handle escape key
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
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t("createRole.nameRequired"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createRole({
        teamId,
        title: trimmedName,
        mission: mission.trim(),
        duties: [],
        ...(memberId ? { memberId: memberId as Id<"members"> } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("createRole.errorCreating"));
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
        aria-labelledby="create-role-title"
        className={`w-full max-w-md mx-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] flex flex-col
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2
            id="create-role-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {t("createRole.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label={tCommon("close")}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Role name - required */}
          <div className="flex flex-col gap-2">
            <label htmlFor="role-name" className="text-sm font-bold text-dark dark:text-light">
              {t("createRole.nameLabel")}
            </label>
            <input
              id="role-name"
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder={t("createRole.namePlaceholder")}
              disabled={isSubmitting}
              className={`px-3 py-2 text-sm rounded-md border bg-white dark:bg-gray-900 text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#eac840] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? "border-red-400 focus:ring-red-400" : "border-gray-300 dark:border-gray-600"}`}
            />
          </div>

          {/* Assign to member - optional */}
          <div className="flex flex-col gap-2">
            <label htmlFor="role-member" className="text-sm font-bold text-dark dark:text-light">
              {t("createRole.assignToLabel")}
            </label>
            <select
              id="role-member"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={isSubmitting}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-900 text-dark dark:text-light
                focus:outline-none focus:ring-2 focus:ring-[#eac840] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{t("createRole.defaultToLeader")}</option>
              {sortedMembers.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.firstname} {m.surname}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {t("createRole.assignHint")}
            </p>
          </div>

          {/* Mission - optional */}
          <div className="flex flex-col gap-2">
            <label htmlFor="role-mission" className="text-sm font-bold text-dark dark:text-light">
              {t("createRole.missionLabel")}
            </label>
            <textarea
              id="role-mission"
              value={mission}
              onChange={(e) => setMission(e.target.value)}
              rows={3}
              placeholder={t("createRole.missionPlaceholder")}
              disabled={isSubmitting}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600
                bg-white dark:bg-gray-900 text-dark dark:text-light
                placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#eac840] transition-colors
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

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="
                px-5 py-2 text-sm font-bold rounded-md
                bg-[#eac840] hover:bg-[#d4af37] text-dark
                transition-colors duration-75
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5
              "
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="w-3.5 h-3.5" />
                  {t("createRole.creating")}
                </>
              ) : (
                t("createRole.submitButton")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
