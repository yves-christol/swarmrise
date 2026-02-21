import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SpinnerIcon } from "../Icons";

type CreateTeamConfirmModalProps = {
  roleName: string;
  isCreating: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
};

export function CreateTeamConfirmModal({
  roleName,
  isCreating,
  error,
  onConfirm,
  onCancel,
  modalRef,
}: CreateTeamConfirmModalProps) {
  const { t } = useTranslation("teams");
  const { t: tCommon } = useTranslation("common");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isCreating) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isCreating]);

  // Focus trap
  useEffect(() => {
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
  }, [modalRef]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isCreating) {
      onCancel();
    }
  };

  return (
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
        aria-labelledby="create-team-confirm-title"
        className={`w-full max-w-md mx-4 bg-surface-primary border-2 border-border-strong rounded-lg shadow-xl
          transition-all duration-150 ease-out
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2
            id="create-team-confirm-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {t("roleManage.createTeamConfirmTitle", { roleName })}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCreating}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label={tCommon("close")}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-text-description">
            {t("roleManage.createTeamDescription")}
          </p>
          <ul className="space-y-2 text-sm text-text-description">
            <li className="flex items-start gap-2">
              <span className="text-highlight-hover dark:text-highlight mt-0.5">-</span>
              <span>{t("roleManage.createTeamBullet1", { roleName })}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-highlight-hover dark:text-highlight mt-0.5">-</span>
              <span>{t("roleManage.createTeamBullet2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-highlight-hover dark:text-highlight mt-0.5">-</span>
              <span>{t("roleManage.createTeamBullet3")}</span>
            </li>
          </ul>
          <p className="text-xs text-text-secondary">
            {t("roleManage.createTeamDecisionNote")}
          </p>

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
              onClick={onCancel}
              disabled={isCreating}
              className="px-4 py-2 text-sm text-text-secondary hover:text-gray-700  dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isCreating}
              aria-label={t("roleManage.createTeamConfirmTitle", { roleName })}
              className="
                px-5 py-2 text-sm font-bold rounded-md
                bg-highlight hover:bg-highlight-hover text-dark
                transition-colors duration-75
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5
              "
            >
              {isCreating ? (
                <>
                  <SpinnerIcon className="w-3.5 h-3.5" />
                  {t("roleManage.creatingTeam")}
                </>
              ) : (
                t("roleManage.createTeamSubmit")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
