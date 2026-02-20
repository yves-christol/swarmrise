import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { SpinnerIcon, CheckIcon, XIcon, ErrorIcon } from "../Icons";

type InvitationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orgaId: Id<"orgas">;
};

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

  // Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [bulkResults, setBulkResults] = useState<Map<string, "pending" | "sending" | "sent" | "error" | "skipped">>(new Map());
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkSummary, setBulkSummary] = useState<{ sent: number; failed: number; skipped: number } | null>(null);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setBulkOpen(false);
        setBulkEmails([]);
        setBulkResults(new Map());
        setBulkError(null);
        setIsBulkSending(false);
        setBulkSummary(null);
        setDuplicateCount(0);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkError(null);
    setBulkSummary(null);
    setBulkResults(new Map());
    setDuplicateCount(0);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Split by newlines, commas, or semicolons
      const raw = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
      // Validate and deduplicate
      const seen = new Set<string>();
      const valid: string[] = [];
      let dupes = 0;
      for (const entry of raw) {
        const lower = entry.toLowerCase();
        if (!EMAIL_REGEX.test(entry)) continue;
        if (seen.has(lower)) {
          dupes++;
          continue;
        }
        seen.add(lower);
        valid.push(entry);
      }

      setDuplicateCount(dupes);

      if (valid.length === 0) {
        setBulkError(t("noValidEmails"));
        setBulkEmails([]);
      } else {
        setBulkEmails(valid);
      }
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleRemoveBulkEmail = (index: number) => {
    setBulkEmails((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBulkSend = async () => {
    if (bulkEmails.length === 0) return;
    setIsBulkSending(true);
    setBulkSummary(null);

    const results = new Map<string, "pending" | "sending" | "sent" | "error" | "skipped">();
    for (const em of bulkEmails) {
      results.set(em, "pending");
    }
    setBulkResults(new Map(results));

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const em of bulkEmails) {
      results.set(em, "sending");
      setBulkResults(new Map(results));

      try {
        await createInvitation({ orgaId, email: em.trim() });
        results.set(em, "sent");
        sent++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const i18nKey = mapErrorToI18nKey(message);
        if (i18nKey === "alreadyMember" || i18nKey === "alreadyInvited") {
          results.set(em, "skipped");
          skipped++;
        } else {
          results.set(em, "error");
          failed++;
        }
      }
      setBulkResults(new Map(results));
    }

    setBulkSummary({ sent, failed, skipped });
    setIsBulkSending(false);
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
        className={`w-full max-w-lg mx-4 bg-surface-primary border-2 border-border-strong rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] flex flex-col
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h2
            id="invitation-modal-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {t("invitations")}
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
            <h3 className="text-sm font-semibold text-dark dark:text-light mb-3">
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
                className={`flex-1 px-3 py-2 text-sm rounded-md border bg-surface-primary text-dark dark:text-light
                  placeholder:text-gray-400
                  focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${sendError ? "border-red-400 focus:ring-red-400" : "border-border-strong"}`}
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

          {/* Bulk import from file */}
          <section>
            <button
              type="button"
              onClick={() => setBulkOpen((prev) => !prev)}
              disabled={isBulkSending}
              className="flex items-center gap-1.5 text-sm font-semibold text-dark dark:text-light hover:text-highlight transition-colors disabled:opacity-50"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-150 ${bulkOpen ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {t("bulkImport")}
            </button>

            {bulkOpen && (
              <div className="mt-3 flex flex-col gap-3">
                <p className="text-xs text-text-tertiary">
                  {t("bulkImportHint")}
                </p>

                {/* File input */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isBulkSending}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBulkSending}
                    className="
                      px-3 py-1.5 text-sm rounded-md border border-border-strong
                      text-dark dark:text-light bg-surface-primary
                      hover:bg-surface-secondary transition-colors duration-75
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {t("chooseFile")}
                  </button>
                </div>

                {/* Parse error */}
                {bulkError && (
                  <p className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400" role="alert">
                    <ErrorIcon className="w-4 h-4 flex-shrink-0" />
                    {bulkError}
                  </p>
                )}

                {/* Duplicate notice */}
                {duplicateCount > 0 && (
                  <p className="text-xs text-text-tertiary">
                    {t("duplicateRemoved", { count: duplicateCount })}
                  </p>
                )}

                {/* Email preview list */}
                {bulkEmails.length > 0 && (
                  <>
                    <p className="text-sm text-dark dark:text-light font-medium">
                      {t("emailsFound", { count: bulkEmails.length })}
                    </p>
                    <div className="border border-border-default rounded-lg overflow-hidden divide-y divide-border-default max-h-48 overflow-y-auto">
                      {bulkEmails.map((em, i) => {
                        const status = bulkResults.get(em);
                        return (
                          <div
                            key={em}
                            className="flex items-center justify-between px-3 py-1.5 bg-surface-primary text-sm"
                          >
                            <span className="text-dark dark:text-light truncate min-w-0">
                              {em}
                            </span>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                              {status === "sending" && <SpinnerIcon className="w-3.5 h-3.5 text-highlight" />}
                              {status === "sent" && <CheckIcon className="w-3.5 h-3.5 text-green-500" />}
                              {status === "error" && <ErrorIcon className="w-3.5 h-3.5 text-red-500" />}
                              {status === "skipped" && <span className="text-xs text-text-tertiary">-</span>}
                              {!status && !isBulkSending && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBulkEmail(i)}
                                  className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                                  aria-label={t("remove")}
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress indicator */}
                    {isBulkSending && !bulkSummary && (
                      <p className="flex items-center gap-1.5 text-sm text-text-tertiary">
                        <SpinnerIcon className="w-3.5 h-3.5" />
                        {t("bulkProgress", {
                          current: Array.from(bulkResults.values()).filter((s) => s !== "pending" && s !== "sending").length,
                          total: bulkEmails.length,
                        })}
                      </p>
                    )}

                    {/* Summary */}
                    {bulkSummary && (
                      <p
                        className={`flex items-center gap-1 text-sm ${
                          bulkSummary.failed > 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-green-600 dark:text-green-400"
                        }`}
                        role="status"
                      >
                        <CheckIcon className="w-4 h-4 flex-shrink-0" />
                        {t("bulkComplete", bulkSummary)}
                      </p>
                    )}

                    {/* Send all button */}
                    {!bulkSummary && (
                      <button
                        type="button"
                        onClick={() => void handleBulkSend()}
                        disabled={isBulkSending || bulkEmails.length === 0}
                        className="
                          self-start px-4 py-2 text-sm font-bold rounded-md
                          bg-highlight hover:bg-highlight-hover text-dark
                          transition-colors duration-75
                          disabled:opacity-50 disabled:cursor-not-allowed
                          flex items-center gap-1.5
                        "
                      >
                        {isBulkSending ? (
                          <>
                            <SpinnerIcon className="w-3.5 h-3.5" />
                            {t("bulkProgress", {
                              current: Array.from(bulkResults.values()).filter((s) => s !== "pending" && s !== "sending").length,
                              total: bulkEmails.length,
                            })}
                          </>
                        ) : (
                          t("sendAll")
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          {/* Pending invitations list */}
          <section>
            <h3 className="text-sm font-semibold text-dark dark:text-light mb-3">
              {t("pendingInvitations")}
            </h3>

            {pendingInvitations === undefined ? (
              <div className="py-4 text-center text-sm text-text-tertiary">
                {tCommon("loading")}
              </div>
            ) : pendingInvitations.length === 0 ? (
              <div className="py-4 text-center text-sm text-text-tertiary">
                {t("noPendingSent")}
              </div>
            ) : (
              <div className="border border-border-default rounded-lg overflow-hidden divide-y divide-border-default">
                {pendingInvitations.map((invitation) => (
                  <div
                    key={invitation._id}
                    className="flex items-center justify-between px-3 py-2.5 bg-surface-primary"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-dark dark:text-light truncate">
                        {invitation.email}
                      </span>
                      <span className="text-xs text-text-tertiary">
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
