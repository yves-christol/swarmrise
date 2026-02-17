import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

type LeaveOrgConfirmModalProps = {
  orgName: string;
  rolesCount: number;
  isLeaving: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  modalRef: React.RefObject<HTMLDivElement | null>;
};

export function LeaveOrgConfirmModal({
  orgName,
  rolesCount,
  isLeaving,
  error,
  onConfirm,
  onCancel,
  modalRef,
}: LeaveOrgConfirmModalProps) {
  const { t: tMembers } = useTranslation("members");
  const { t: tCommon } = useTranslation("common");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLeaving) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isLeaving]);

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
    if (e.target === e.currentTarget && !isLeaving) {
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
        aria-labelledby="leave-org-confirm-title"
        className={`w-full max-w-md mx-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl
          transition-all duration-150 ease-out
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2
            id="leave-org-confirm-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {tMembers("leaveOrgConfirmTitle", { orgName })}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLeaving}
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
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {tMembers("leaveOrgConfirmDescription")}
          </p>

          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-red-500 dark:text-red-400 mt-0.5">-</span>
              <span>{tMembers("leaveOrgBullet1", { count: rolesCount })}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 dark:text-red-400 mt-0.5">-</span>
              <span>{tMembers("leaveOrgBullet2")}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 dark:text-red-400 mt-0.5">-</span>
              <span>{tMembers("leaveOrgBullet3")}</span>
            </li>
          </ul>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            {tMembers("leaveOrgDecisionNote")}
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
              disabled={isLeaving}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLeaving}
              className="
                px-5 py-2 text-sm font-bold rounded-md
                bg-red-600 hover:bg-red-700 text-white
                transition-colors duration-75
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-1.5
              "
            >
              {isLeaving ? (
                <>
                  <svg
                    className="animate-spin w-3.5 h-3.5"
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
                  {tMembers("leaving")}
                </>
              ) : (
                tMembers("confirmLeaveOrg")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
