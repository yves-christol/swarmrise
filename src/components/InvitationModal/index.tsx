import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type InvitationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orgaId: Id<"orgas">;
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

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
      clipRule="evenodd"
    />
  </svg>
);

const ErrorIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
  </svg>
);

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  }
  if (hours > 0) {
    return `${hours}h ago`;
  }
  if (minutes > 0) {
    return `${minutes}m ago`;
  }
  return "just now";
}

/**
 * Maps known backend error messages to i18n keys.
 * Returns the i18n key if matched, otherwise null.
 */
function mapErrorToI18nKey(errorMessage: string): string | null {
  if (errorMessage.includes("already a member")) return "alreadyMember";
  if (errorMessage.includes("pending invitation already exists")) return "alreadyInvited";
  if (errorMessage.includes("Rate limit exceeded")) return "rateLimitExceeded";
  if (errorMessage.includes("Email domain is not authorized")) return "emailDomainNotAllowed";
  if (errorMessage.includes("Invalid email format")) return "invalidEmail";
  return null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InvitationModal({ isOpen, onClose, orgaId }: InvitationModalProps) {
  const { t } = useTranslation("invitations");
  const { t: tCommon } = useTranslation("common");

  // Queries
  const pendingInvitations = useQuery(
    api.invitations.functions.listInvitationsInOrga,
    isOpen ? { orgaId, status: "pending" as const } : "skip"
  );

  // Mutations
  const createInvitation = useMutation(api.invitations.functions.createInvitation);
  const updateInvitationStatus = useMutation(api.invitations.functions.updateInvitationStatus);

  // Form state
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [cancellingId, setCancellingId] = useState<Id<"invitations"> | null>(null);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

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
        setEmail("");
        setIsSending(false);
        setSendError(null);
        setSendSuccess(false);
        setCancellingId(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus the email input when modal opens
  useEffect(() => {
    if (isOpen && isVisible) {
      const timer = setTimeout(() => emailInputRef.current?.focus(), 100);
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

  const validateEmail = useCallback(
    (value: string): string | null => {
      const trimmed = value.trim();
      if (!trimmed) return t("noEmail");
      if (!EMAIL_REGEX.test(trimmed)) return t("invalidEmail");
      return null;
    },
    [t]
  );

  const handleSend = async () => {
    const validationError = validateEmail(email);
    if (validationError) {
      setSendError(validationError);
      return;
    }

    setIsSending(true);
    setSendError(null);
    setSendSuccess(false);

    try {
      await createInvitation({ orgaId, email: email.trim() });
      setSendSuccess(true);
      setEmail("");
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const i18nKey = mapErrorToI18nKey(message);
      setSendError(i18nKey ? t(i18nKey as any) : t("errorSending"));
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = async (invitationId: Id<"invitations">) => {
    setCancellingId(invitationId);
    try {
      await updateInvitationStatus({ invitationId, status: "rejected" });
    } catch (err) {
      console.error("Failed to cancel invitation:", err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSending) {
      void handleSend();
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
        aria-labelledby="invitation-modal-title"
        className={`w-full max-w-lg mx-4 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] flex flex-col
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2
            id="invitation-modal-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {t("pendingInvitations")}
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

        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Send invitation form */}
          <section>
            <h3 className="font-swarm text-sm font-semibold text-dark dark:text-light mb-3">
              {t("sendInvitation")}
            </h3>
            <div className="flex gap-2">
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (sendError) setSendError(null);
                  if (sendSuccess) setSendSuccess(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("emailPlaceholder")}
                disabled={isSending}
                className={`flex-1 px-3 py-2 text-sm rounded-md border bg-white dark:bg-gray-900 text-dark dark:text-light
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${sendError ? "border-red-400 focus:ring-red-400" : "border-gray-300 dark:border-gray-600"}`}
                aria-invalid={!!sendError}
                aria-describedby={sendError ? "send-error" : sendSuccess ? "send-success" : undefined}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending || !email.trim()}
                className="
                  px-4 py-2 text-sm font-bold rounded-md
                  bg-highlight hover:bg-highlight-hover text-dark
                  transition-colors duration-75
                  disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center gap-1.5
                "
              >
                {isSending ? (
                  <>
                    <SpinnerIcon className="w-3.5 h-3.5" />
                    {t("sending")}
                  </>
                ) : (
                  t("send")
                )}
              </button>
            </div>

            {/* Error message */}
            {sendError && (
              <p
                id="send-error"
                className="flex items-center gap-1 mt-2 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                <ErrorIcon className="w-4 h-4 flex-shrink-0" />
                {sendError}
              </p>
            )}

            {/* Success message */}
            {sendSuccess && (
              <p
                id="send-success"
                className="flex items-center gap-1 mt-2 text-sm text-green-600 dark:text-green-400"
                role="status"
              >
                <CheckIcon className="w-4 h-4 flex-shrink-0" />
                {t("invitationSent")}
              </p>
            )}
          </section>

          {/* Pending invitations list */}
          <section>
            <h3 className="font-swarm text-sm font-semibold text-dark dark:text-light mb-3">
              {t("pendingInvitations")}
            </h3>

            {pendingInvitations === undefined ? (
              <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                {tCommon("loading")}
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
                {t("noPendingSent")}
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation._id}
                    className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-gray-800"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-dark dark:text-light truncate">
                        {invitation.email}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {t("sentOn", { date: formatRelativeDate(invitation.sentDate) })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCancel(invitation._id)}
                      disabled={cancellingId === invitation._id}
                      className="
                        ml-3 px-2.5 py-1 text-xs rounded-md
                        text-red-600 dark:text-red-400
                        hover:bg-red-50 dark:hover:bg-red-900/20
                        transition-colors duration-75
                        disabled:opacity-50 disabled:cursor-not-allowed
                        flex items-center gap-1
                        flex-shrink-0
                      "
                    >
                      {cancellingId === invitation._id ? (
                        <>
                          <SpinnerIcon className="w-3 h-3" />
                          {t("cancelling")}
                        </>
                      ) : (
                        t("cancelInvitation")
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
