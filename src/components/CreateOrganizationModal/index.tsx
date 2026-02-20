import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOrgaStore } from "../../tools/orgaStore";
import { Id } from "../../../convex/_generated/dataModel";
import { EmailDomainsInput } from "../EmailDomainsInput";
import { SpinnerIcon, CheckIcon, ErrorIcon } from "../Icons";
import { ACCENT_PRESETS } from "../../utils/colorPresets";

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

const OrgPlaceholderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
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
  const generateUploadUrl = useMutation(api.storage.functions.generateUploadUrl);

  const [name, setName] = useState("");
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [firstTeamName, setFirstTeamName] = useState("");
  const [authorizedEmailDomains, setAuthorizedEmailDomains] = useState<string[]>([]);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setName("");
        setAccentColor(null);
        setError(null);
        setValidationError(null);
        setIsSubmitting(false);
        setShowAdvanced(false);
        setFirstTeamName("");
        setAuthorizedEmailDomains([]);
        if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
        setLogoFile(null);
        setLogoPreviewUrl(null);
        setIsUploadingLogo(false);
        setLogoUploadError(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, logoPreviewUrl]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) onClose();
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
      if (e.shiftKey && document.activeElement === firstElement) { e.preventDefault(); lastElement.focus(); }
      else if (!e.shiftKey && document.activeElement === lastElement) { e.preventDefault(); firstElement.focus(); }
    };
    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  const validateName = useCallback(
    (value: string): string | null => {
      const trimmed = value.trim();
      if (!trimmed) return t("validation.nameRequired");
      if (trimmed.length < 2) return t("validation.nameTooShort");
      if (trimmed.length > 100) return t("validation.nameTooLong");
      return null;
    },
    [t]
  );

  const handleBlur = () => {
    const error = validateName(name);
    setValidationError(error);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) { setLogoUploadError(true); return; }
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoUploadError(false);
  };

  const handleRemoveFile = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoUploadError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadLogo = async (): Promise<Id<"_storage"> | null> => {
    if (!logoFile) return null;
    setIsUploadingLogo(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": logoFile.type }, body: logoFile });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();
      return storageId as Id<"_storage">;
    } catch (err) {
      console.error("Failed to upload logo:", err);
      setLogoUploadError(true);
      return null;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationResult = validateName(name);
    if (validationResult) { setValidationError(validationResult); inputRef.current?.focus(); return; }
    setIsSubmitting(true);
    setError(null);

    const trimmedFirstTeamName = firstTeamName.trim();

    uploadLogo()
      .then((logoStorageId) => {
        if (logoFile && !logoStorageId) {
          setError(t("logoUploadError"));
          setIsSubmitting(false);
          return;
        }
        return createOrganization({
          name: name.trim(),
          ...(accentColor && { accentColor }),
          ...(logoStorageId && { logoStorageId }),
          ...(trimmedFirstTeamName && { firstTeamName: trimmedFirstTeamName }),
          ...(authorizedEmailDomains.length > 0 && { authorizedEmailDomains }),
        });
      })
      .then((orgaId) => {
        if (orgaId) { selectOrga(orgaId); onClose(); }
      })
      .catch((err) => {
        console.error("Failed to create organization:", err);
        setError(t("errors.unknownError"));
        setIsSubmitting(false);
      });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) onClose();
  };

  if (!isOpen) return null;

  return createPortal(
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
        aria-labelledby="modal-title"
        className={`w-full max-w-md mx-4 p-6 bg-surface-primary border-2 border-border-strong rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] overflow-y-auto
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        <h2 id="modal-title" className="text-xl font-bold text-dark dark:text-light mb-6">
          {t("createOrganizationTitle")}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Name input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="org-name" className="text-sm font-bold text-dark dark:text-light">
              {t("organizationNameLabel")}
            </label>
            <input
              ref={inputRef}
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (validationError) setValidationError(null); }}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className={`px-4 py-3 rounded-md border bg-surface-primary text-dark dark:text-light
                focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                ${validationError ? "border-red-500 focus:ring-red-500" : "border-border-strong"}`}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "name-error" : undefined}
            />
            {validationError && (
              <p id="name-error" className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400" role="alert">
                <ErrorIcon className="w-4 h-4 flex-shrink-0" />
                {validationError}
              </p>
            )}
          </div>

          {/* Accent color presets (optional, inline) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-text-secondary">
              {t("settings.accentColorOptional")}
            </label>
            <div className="flex items-center gap-2">
              {ACCENT_PRESETS.map((preset) => {
                const isSelected = accentColor === preset.color;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setAccentColor(isSelected ? null : preset.color)}
                    disabled={isSubmitting}
                    className={`w-7 h-7 rounded-full border-2 transition-all disabled:opacity-50
                      ${isSelected ? "border-highlight ring-2 ring-highlight/30 scale-110" : "border-border-default hover:scale-105"}`}
                    style={{ backgroundColor: preset.color }}
                    aria-pressed={isSelected}
                    aria-label={t(preset.labelKey as never)}
                  >
                    {isSelected && <CheckIcon className="w-3.5 h-3.5 mx-auto text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            {t("advancedOptions")}
          </button>

          {/* Advanced options section */}
          {showAdvanced && (
            <div className="flex flex-col gap-4 p-4 rounded-md bg-surface-secondary border border-border-default">
              {/* Logo upload */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-dark dark:text-light">{t("logoLabel")}</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-md bg-surface-tertiary flex items-center justify-center overflow-hidden flex-shrink-0 border border-border-strong">
                    {logoPreviewUrl ? (
                      <img src={logoPreviewUrl} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <OrgPlaceholderIcon className="w-7 h-7 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={handleFileSelect} disabled={isSubmitting || isUploadingLogo} className="hidden" id="logo-file-input" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting || isUploadingLogo}
                        className="px-3 py-1.5 text-sm rounded-md border border-border-strong bg-surface-primary text-dark dark:text-light hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {logoFile ? t("logoChangeButton") : t("logoUploadButton")}
                      </button>
                      {logoFile && (
                        <button type="button" onClick={handleRemoveFile} disabled={isSubmitting || isUploadingLogo}
                          className="px-3 py-1.5 text-sm rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                          {t("logoRemoveButton")}
                        </button>
                      )}
                    </div>
                    {logoFile && <span className="text-xs text-text-secondary truncate max-w-[200px]">{logoFile.name}</span>}
                  </div>
                </div>
                {logoUploadError && (
                  <p className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                    <ErrorIcon className="w-4 h-4 flex-shrink-0" />
                    {t("logoUploadError")}
                  </p>
                )}
                <p className="text-xs text-gray-400">{t("logoHint")}</p>
              </div>

              {/* First team name */}
              <div className="flex flex-col gap-2">
                <label htmlFor="first-team-name" className="text-sm font-medium text-dark dark:text-light">
                  {t("firstTeamNameLabel")}
                </label>
                <input id="first-team-name" type="text" value={firstTeamName} onChange={(e) => setFirstTeamName(e.target.value)} disabled={isSubmitting}
                  placeholder={name || t("firstTeamNamePlaceholder")}
                  className="px-3 py-2 rounded-md border border-border-strong bg-surface-primary text-dark dark:text-light text-sm focus:outline-none focus:ring-2 focus:ring-highlight transition-colors disabled:opacity-50 disabled:cursor-not-allowed" />
                <p className="text-xs text-gray-400">{t("firstTeamNameHint")}</p>
              </div>

              {/* Authorized email domains */}
              <EmailDomainsInput domains={authorizedEmailDomains} onChange={setAuthorizedEmailDomains} disabled={isSubmitting} compact />
            </div>
          )}

          {/* Backend error */}
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400" role="alert">
              <ErrorIcon className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting}
              className="px-4 py-2 text-text-secondary hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t("cancelButton")}
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-6 py-2 bg-highlight hover:bg-highlight-hover text-dark font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
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
    </div>,
    document.body
  );
};
