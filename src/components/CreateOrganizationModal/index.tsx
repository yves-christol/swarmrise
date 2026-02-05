import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOrgaStore } from "../../tools/orgaStore";

// Default swarmrise color scheme (Bee Gold / Wing Blue)
const DEFAULT_COLOR_SCHEME = {
  primary: { r: 234, g: 200, b: 64 },   // #eac840
  secondary: { r: 162, g: 219, b: 237 }, // #a2dbed
};

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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

type CreateOrganizationModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const CreateOrganizationModal = ({
  isOpen,
  onClose,
}: CreateOrganizationModalProps) => {
  const { t } = useTranslation("orgs");
  const { selectOrga } = useOrgaStore();
  const createOrganization = useMutation(api.orgas.functions.createOrganization);

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the modal is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError(null);
      setValidationError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  // Trap focus within modal
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

  const validateName = useCallback(
    (value: string): string | null => {
      const trimmed = value.trim();
      if (!trimmed) {
        return t("validation.nameRequired");
      }
      if (trimmed.length < 2) {
        return t("validation.nameTooShort");
      }
      if (trimmed.length > 100) {
        return t("validation.nameTooLong");
      }
      return null;
    },
    [t]
  );

  const handleBlur = () => {
    const error = validateName(name);
    setValidationError(error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validationResult = validateName(name);
    if (validationResult) {
      setValidationError(validationResult);
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    createOrganization({
      name: name.trim(),
      colorScheme: DEFAULT_COLOR_SCHEME,
    })
      .then((orgaId) => {
        // Select the new organization
        selectOrga(orgaId);
        // Close modal
        onClose();
      })
      .catch((err) => {
        console.error("Failed to create organization:", err);
        setError(t("errors.unknownError"));
        setIsSubmitting(false);
      });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md mx-4 p-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl"
      >
        <h2
          id="modal-title"
          className="text-xl font-bold text-dark dark:text-light mb-6"
        >
          {t("createOrganizationTitle")}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Name input group */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="org-name"
              className="text-sm font-bold text-dark dark:text-light"
            >
              {t("organizationNameLabel")}
            </label>
            <input
              ref={inputRef}
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError) {
                  setValidationError(null);
                }
              }}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className={`px-4 py-3 rounded-md border bg-white dark:bg-gray-900 text-dark dark:text-light
                focus:outline-none focus:ring-2 focus:ring-[#eac840] transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  validationError
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "name-error" : undefined}
            />
            {validationError && (
              <p
                id="name-error"
                className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
                role="alert"
              >
                <ErrorIcon className="w-4 h-4 flex-shrink-0" />
                {validationError}
              </p>
            )}
          </div>

          {/* Backend error */}
          {error && (
            <p
              className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400"
              role="alert"
            >
              <ErrorIcon className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("cancelButton")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#eac840] hover:bg-[#d4af37] text-dark font-bold rounded-lg
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="w-4 h-4" />
                  {t("creatingButton")}
                </>
              ) : (
                t("createButton")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
