import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { EmailDomainsInput } from "../EmailDomainsInput";
import { SpinnerIcon, CheckIcon, XIcon, ErrorIcon } from "../Icons";
import { FONT_OPTIONS, ALL_GOOGLE_FONTS_URL } from "./fonts";
import { COLOR_PRESETS } from "../../utils/colorPresets";

type ColorScheme = { primary: string; secondary: string };

const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const OrgPlaceholderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);

type OrgaSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  orgaId: Id<"orgas">;
  canDelete: boolean;
};

export const OrgaSettingsModal = ({
  isOpen,
  onClose,
  orgaId,
  canDelete,
}: OrgaSettingsModalProps) => {
  const { t } = useTranslation("orgs");
  const { t: tCommon } = useTranslation("common");

  // Queries
  const orga = useQuery(api.orgas.functions.getOrgaById, { orgaId });
  const logoUrl = orga?.logoUrl ?? null;
  const members = useQuery(api.members.functions.listMembers, { orgaId });

  // Mutations
  const updateOrga = useMutation(api.orgas.functions.updateOrga);
  const deleteOrga = useMutation(api.orgas.functions.deleteOrganization);
  const transferOwnership = useMutation(api.orgas.functions.transferOwnership);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  // Form state
  const [name, setName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("custom");
  const [customPrimary, setCustomPrimary] = useState(COLOR_PRESETS[0].primary);
  const [customSecondary, setCustomSecondary] = useState(COLOR_PRESETS[0].secondary);
  const [emailDomains, setEmailDomains] = useState<string[]>([]);

  // Customisation state
  const [paperColorLight, setPaperColorLight] = useState<string | null>(null);
  const [paperColorDark, setPaperColorDark] = useState<string | null>(null);
  const [highlightColorLight, setHighlightColorLight] = useState<string | null>(null);
  const [highlightColorDark, setHighlightColorDark] = useState<string | null>(null);
  const [titleFont, setTitleFont] = useState("");

  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState(false);

  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<Id<"members"> | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form from orga data
  useEffect(() => {
    if (orga && isOpen) {
      setName(orga.name);
      setEmailDomains(orga.authorizedEmailDomains ?? []);

      // Set color scheme
      if (orga.colorScheme) {
        setCustomPrimary(orga.colorScheme.primary);
        setCustomSecondary(orga.colorScheme.secondary);

        // Check if it matches a preset
        const matchingPreset = COLOR_PRESETS.find(
          (p) =>
            p.primary.toLowerCase() === orga.colorScheme.primary.toLowerCase() &&
            p.secondary.toLowerCase() === orga.colorScheme.secondary.toLowerCase()
        );
        setSelectedPresetId(matchingPreset?.id ?? "custom");
      }

      // Set customisation colors
      setPaperColorLight(orga.paperColorLight ?? null);
      setPaperColorDark(orga.paperColorDark ?? null);
      setHighlightColorLight(orga.highlightColorLight ?? null);
      setHighlightColorDark(orga.highlightColorDark ?? null);
      setTitleFont(orga.titleFont ?? "");

      // Reset logo state
      setLogoFile(null);
      setLogoPreviewUrl(null);
      setLogoRemoved(false);
      setLogoUploadError(false);
      setShowDeleteConfirm(false);
      setShowTransferConfirm(false);
      setSelectedNewOwnerId(null);
    }
  }, [orga, isOpen]);

  // Get other members (for transfer ownership dropdown)
  const otherMembers = useMemo(() => {
    if (!members || !orga) return [];
    return members.filter((m) => m.personId !== orga.owner);
  }, [members, orga]);

  // Get current color scheme
  const getColorScheme = useCallback((): ColorScheme => {
    if (selectedPresetId === "custom") {
      return { primary: customPrimary, secondary: customSecondary };
    }
    const preset = COLOR_PRESETS.find((p) => p.id === selectedPresetId);
    return preset
      ? { primary: preset.primary, secondary: preset.secondary }
      : { primary: customPrimary, secondary: customSecondary };
  }, [selectedPresetId, customPrimary, customSecondary]);

  // Detect if form has changes
  const hasChanges = useMemo(() => {
    if (!orga) return false;

    const currentColorScheme = getColorScheme();
    const originalColorScheme = orga.colorScheme ?? { primary: COLOR_PRESETS[0].primary, secondary: COLOR_PRESETS[0].secondary };
    const originalDomains = orga.authorizedEmailDomains ?? [];

    return (
      name !== orga.name ||
      currentColorScheme.primary.toLowerCase() !== originalColorScheme.primary.toLowerCase() ||
      currentColorScheme.secondary.toLowerCase() !== originalColorScheme.secondary.toLowerCase() ||
      !arraysEqual(emailDomains, originalDomains) ||
      logoFile !== null ||
      logoRemoved ||
      (paperColorLight ?? null) !== (orga.paperColorLight ?? null) ||
      (paperColorDark ?? null) !== (orga.paperColorDark ?? null) ||
      (highlightColorLight ?? null) !== (orga.highlightColorLight ?? null) ||
      (highlightColorDark ?? null) !== (orga.highlightColorDark ?? null) ||
      titleFont !== (orga.titleFont ?? "")
    );
  }, [orga, name, getColorScheme, emailDomains, logoFile, logoRemoved, paperColorLight, paperColorDark, highlightColorLight, highlightColorDark, titleFont]);

  // Preload Google Fonts for picker preview when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const linkId = "google-fonts-picker-preview";
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = ALL_GOOGLE_FONTS_URL;
    document.head.appendChild(link);

    return () => {
      document.getElementById(linkId)?.remove();
    };
  }, [isOpen]);

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
        setError(null);
        setValidationError(null);
        setIsSubmitting(false);
        if (logoPreviewUrl) {
          URL.revokeObjectURL(logoPreviewUrl);
        }
        setLogoFile(null);
        setLogoPreviewUrl(null);
        setLogoRemoved(false);
        setIsUploadingLogo(false);
        setLogoUploadError(false);
        setShowDeleteConfirm(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, logoPreviewUrl]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        // Inline handleClose logic to avoid dependency issues
        if (hasChanges) {
          if (window.confirm(t("settings.unsavedChangesWarning"))) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, hasChanges, onClose, t]);

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

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm(t("settings.unsavedChangesWarning"))) {
        onClose();
      }
    } else {
      onClose();
    }
  };

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

  const handleNameBlur = () => {
    const error = validateName(name);
    setValidationError(error);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setLogoUploadError(true);
      return;
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);

    setLogoFile(file);
    setLogoPreviewUrl(previewUrl);
    setLogoRemoved(false);
    setLogoUploadError(false);
  };

  const handleRemoveLogo = () => {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoRemoved(true);
    setLogoUploadError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadLogo = async (): Promise<Id<"_storage"> | null> => {
    if (!logoFile) return null;

    setIsUploadingLogo(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": logoFile.type },
        body: logoFile,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

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

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = COLOR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCustomPrimary(preset.primary);
      setCustomSecondary(preset.secondary);
    }
  };

  const handleCustomColorChange = (type: "primary" | "secondary", hex: string) => {
    if (type === "primary") {
      setCustomPrimary(hex);
    } else {
      setCustomSecondary(hex);
    }
    setSelectedPresetId("custom");
  };

  const handleSave = async () => {
    const validationResult = validateName(name);
    if (validationResult) {
      setValidationError(validationResult);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let logoStorageId: Id<"_storage"> | null | undefined;

      // Handle logo upload/removal
      if (logoFile) {
        logoStorageId = await uploadLogo();
        if (!logoStorageId) {
          setError(t("logoUploadError"));
          setIsSubmitting(false);
          return;
        }
      } else if (logoRemoved) {
        logoStorageId = null;
      }

      const colorScheme = getColorScheme();

      // Build customisation args (only send changed values)
      const customisationArgs: Record<string, string | null> = {};
      if ((paperColorLight ?? null) !== (orga?.paperColorLight ?? null)) {
        customisationArgs.paperColorLight = paperColorLight;
      }
      if ((paperColorDark ?? null) !== (orga?.paperColorDark ?? null)) {
        customisationArgs.paperColorDark = paperColorDark;
      }
      if ((highlightColorLight ?? null) !== (orga?.highlightColorLight ?? null)) {
        customisationArgs.highlightColorLight = highlightColorLight;
      }
      if ((highlightColorDark ?? null) !== (orga?.highlightColorDark ?? null)) {
        customisationArgs.highlightColorDark = highlightColorDark;
      }
      if (titleFont !== (orga?.titleFont ?? "")) {
        customisationArgs.titleFont = titleFont || null;
      }

      await updateOrga({
        orgaId,
        name: name.trim(),
        colorScheme,
        ...(logoStorageId !== undefined && { logoStorageId }),
        authorizedEmailDomains: emailDomains.length > 0 ? emailDomains : null,
        ...customisationArgs,
      });

      onClose();
    } catch (err) {
      console.error("Failed to update organization:", err);
      setError(t("errors.unknownError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    try {
      await deleteOrga({ orgaId });
      onClose();
    } catch (err) {
      console.error("Failed to delete organization:", err);
      setError(t("errors.unknownError"));
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwnerId) return;
    setIsSubmitting(true);
    try {
      await transferOwnership({ orgaId, newOwnerMemberId: selectedNewOwnerId });
      onClose();
    } catch (err) {
      console.error("Failed to transfer ownership:", err);
      setError(t("errors.unknownError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const currentColors = getColorScheme();
  const displayLogoUrl = logoPreviewUrl ?? (logoRemoved ? null : logoUrl);

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
        aria-labelledby="settings-title"
        className={`w-full max-w-lg mx-4 p-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] overflow-y-auto
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2
            id="settings-title"
            className="text-xl font-bold text-dark dark:text-light"
          >
            {t("settings.title")}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label={tCommon("close")}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* General Settings Section */}
          <section>
            <h3 className="text-lg font-semibold text-dark dark:text-light mb-4">
              {t("settings.generalSection")}
            </h3>

            {/* Name input */}
            <div className="flex flex-col gap-2 mb-4">
              <label
                htmlFor="org-name"
                className="text-sm font-bold text-dark dark:text-light"
              >
                {t("organizationNameLabel")}
              </label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onBlur={handleNameBlur}
                disabled={isSubmitting}
                className={`px-4 py-3 rounded-md border bg-white dark:bg-gray-900 text-dark dark:text-light
                  focus:outline-none focus:ring-2 focus:ring-highlight transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${validationError ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600"}`}
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

            {/* Color scheme picker */}
            <div className="flex flex-col gap-3 mb-4">
              <label className="text-sm font-bold text-dark dark:text-light">
                {t("colorSchemeLabel")}
              </label>

              {/* Preset grid */}
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    disabled={isSubmitting}
                    className={`relative flex items-center justify-center gap-1 p-2 rounded-md border-2 transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${selectedPresetId === preset.id
                        ? "border-highlight ring-2 ring-highlight/30"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    aria-pressed={selectedPresetId === preset.id}
                    aria-label={t(`presets.${preset.id}` as any)}
                  >
                    <div
                      className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-500"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-500"
                      style={{ backgroundColor: preset.secondary }}
                    />
                    {selectedPresetId === preset.id && (
                      <CheckIcon className="absolute -top-1 -right-1 w-4 h-4 text-highlight bg-white dark:bg-gray-800 rounded-full" />
                    )}
                  </button>
                ))}

                {/* Custom option */}
                <button
                  type="button"
                  onClick={() => setSelectedPresetId("custom")}
                  disabled={isSubmitting}
                  className={`relative flex items-center justify-center gap-1 p-2 rounded-md border-2 transition-all
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${selectedPresetId === "custom"
                      ? "border-highlight ring-2 ring-highlight/30"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  aria-pressed={selectedPresetId === "custom"}
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t("customColors")}
                  </span>
                  {selectedPresetId === "custom" && (
                    <CheckIcon className="absolute -top-1 -right-1 w-4 h-4 text-highlight bg-white dark:bg-gray-800 rounded-full" />
                  )}
                </button>
              </div>

              {/* Custom color pickers */}
              {selectedPresetId === "custom" && (
                <div className="flex gap-4 pt-2">
                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="primary-color" className="text-xs text-gray-500 dark:text-gray-400">
                      {t("primaryColorLabel")}
                    </label>
                    <input
                      id="primary-color"
                      type="color"
                      value={customPrimary}
                      onChange={(e) => handleCustomColorChange("primary", e.target.value)}
                      disabled={isSubmitting}
                      className="w-full h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label htmlFor="secondary-color" className="text-xs text-gray-500 dark:text-gray-400">
                      {t("secondaryColorLabel")}
                    </label>
                    <input
                      id="secondary-color"
                      type="color"
                      value={customSecondary}
                      onChange={(e) => handleCustomColorChange("secondary", e.target.value)}
                      disabled={isSubmitting}
                      className="w-full h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Live preview */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-gray-100 dark:bg-gray-700/50">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t("preview")}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="flex-1 h-3 rounded-full transition-colors"
                    style={{ backgroundColor: currentColors.primary }}
                  />
                  <div
                    className="flex-1 h-3 rounded-full transition-colors"
                    style={{ backgroundColor: currentColors.secondary }}
                  />
                </div>
              </div>
            </div>

            {/* Logo upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-dark dark:text-light">
                {t("logoLabel")}
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-300 dark:border-gray-500">
                  {displayLogoUrl ? (
                    <img
                      src={displayLogoUrl}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <OrgPlaceholderIcon className="w-7 h-7 text-gray-400" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleFileSelect}
                    disabled={isSubmitting || isUploadingLogo}
                    className="hidden"
                    id="logo-file-input"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting || isUploadingLogo}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600
                        bg-white dark:bg-gray-800 text-dark dark:text-light
                        hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {displayLogoUrl ? t("logoChangeButton") : t("logoUploadButton")}
                    </button>
                    {displayLogoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={isSubmitting || isUploadingLogo}
                        className="px-3 py-1.5 text-sm rounded-md
                          text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20
                          transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t("logoRemoveButton")}
                      </button>
                    )}
                  </div>
                  {logoFile && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                      {logoFile.name}
                    </span>
                  )}
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
          </section>

          {/* Customisation Section */}
          <section>
            <h3 className="text-lg font-semibold text-dark dark:text-light mb-4">
              {t("settings.customisationSection")}
            </h3>

            {/* Paper Color */}
            <div className="flex flex-col gap-3 mb-4">
              <label className="text-sm font-bold text-dark dark:text-light">
                {t("settings.paperColorLabel")}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("settings.paperColorHint")}
              </p>
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="paper-color-light" className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.lightMode")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="paper-color-light"
                      type="color"
                      value={paperColorLight ?? "#ffffff"}
                      onChange={(e) => setPaperColorLight(e.target.value)}
                      disabled={isSubmitting}
                      className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {paperColorLight && (
                      <button
                        type="button"
                        onClick={() => setPaperColorLight(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {t("settings.resetColor")}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="paper-color-dark" className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.darkMode")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="paper-color-dark"
                      type="color"
                      value={paperColorDark ?? "#1a1a2e"}
                      onChange={(e) => setPaperColorDark(e.target.value)}
                      disabled={isSubmitting}
                      className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {paperColorDark && (
                      <button
                        type="button"
                        onClick={() => setPaperColorDark(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {t("settings.resetColor")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Highlight Color */}
            <div className="flex flex-col gap-3">
              <label className="text-sm font-bold text-dark dark:text-light">
                {t("settings.highlightColorLabel")}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("settings.highlightColorHint")}
              </p>
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="highlight-color-light" className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.lightMode")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="highlight-color-light"
                      type="color"
                      value={highlightColorLight ?? "#eac840"}
                      onChange={(e) => setHighlightColorLight(e.target.value)}
                      disabled={isSubmitting}
                      className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {highlightColorLight && (
                      <button
                        type="button"
                        onClick={() => setHighlightColorLight(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {t("settings.resetColor")}
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="highlight-color-dark" className="text-xs text-gray-500 dark:text-gray-400">
                    {t("settings.darkMode")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="highlight-color-dark"
                      type="color"
                      value={highlightColorDark ?? "#eac840"}
                      onChange={(e) => setHighlightColorDark(e.target.value)}
                      disabled={isSubmitting}
                      className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {highlightColorDark && (
                      <button
                        type="button"
                        onClick={() => setHighlightColorDark(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {t("settings.resetColor")}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Live preview */}
              <div className="flex items-center gap-3 p-3 rounded-md bg-gray-100 dark:bg-gray-700/50">
                <span className="text-xs text-gray-500 dark:text-gray-400">{t("preview")}</span>
                <div className="flex-1 flex items-center gap-2">
                  <div
                    className="flex-1 h-8 rounded flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: highlightColorLight ?? "#eac840",
                      color: "#1a1a2e",
                    }}
                  >
                    {t("settings.lightMode")}
                  </div>
                  <div
                    className="flex-1 h-8 rounded flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: highlightColorDark ?? "#eac840",
                      color: "#1a1a2e",
                    }}
                  >
                    {t("settings.darkMode")}
                  </div>
                </div>
              </div>
            </div>

            {/* Title Font */}
            <div className="flex flex-col gap-3 mt-4">
              <label htmlFor="title-font" className="text-sm font-bold text-dark dark:text-light">
                {t("settings.titleFontLabel")}
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("settings.titleFontHint")}
              </p>
              <div className="flex items-center gap-2">
                <select
                  id="title-font"
                  value={titleFont}
                  onChange={(e) => setTitleFont(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-900 text-dark dark:text-light text-sm
                    focus:outline-none focus:ring-2 focus:ring-highlight
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option
                      key={font.value}
                      value={font.value}
                      style={font.value ? { fontFamily: font.value } : undefined}
                    >
                      {font.value ? font.label : t("settings.titleFontDefault")}
                    </option>
                  ))}
                </select>
                {titleFont && (
                  <button
                    type="button"
                    onClick={() => setTitleFont("")}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {t("settings.resetColor")}
                  </button>
                )}
              </div>
              {/* Font preview */}
              <div className="p-3 rounded-md bg-gray-100 dark:bg-gray-700/50">
                <p
                  className="text-lg font-semibold text-dark dark:text-light"
                  style={titleFont ? { fontFamily: titleFont } : undefined}
                >
                  {t("settings.titleFontPreview")}
                </p>
              </div>
            </div>
          </section>

          {/* Access Settings Section */}
          <section>
            <h3 className="text-lg font-semibold text-dark dark:text-light mb-4">
              {t("settings.accessSection")}
            </h3>
            <EmailDomainsInput
              domains={emailDomains}
              onChange={setEmailDomains}
              disabled={isSubmitting}
            />
          </section>

          {/* Danger Zone Section */}
          <section className="pt-4 border-t border-red-200 dark:border-red-900/50">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
              {t("dangerZone")}
            </h3>

            {/* Transfer Ownership */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-dark dark:text-light mb-2">
                {t("settings.transferOwnership")}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t("settings.transferOwnershipDescription")}
              </p>

              {otherMembers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                  {t("settings.noOtherMembers")}
                </p>
              ) : showTransferConfirm ? (
                <div className="flex flex-col gap-3">
                  <select
                    value={selectedNewOwnerId ?? ""}
                    onChange={(e) => setSelectedNewOwnerId(e.target.value as Id<"members">)}
                    disabled={isSubmitting}
                    className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                      bg-white dark:bg-gray-900 text-dark dark:text-light text-sm
                      focus:outline-none focus:ring-2 focus:ring-red-500
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">{t("settings.selectNewOwner")}</option>
                    {otherMembers.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.firstname} {member.surname} ({member.email})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => void handleTransferOwnership()}
                      disabled={isSubmitting || !selectedNewOwnerId}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? t("settings.transferring") : t("settings.confirmTransfer")}
                    </button>
                    <button
                      onClick={() => {
                        setShowTransferConfirm(false);
                        setSelectedNewOwnerId(null);
                      }}
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {tCommon("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowTransferConfirm(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t("settings.transferOwnership")}
                </button>
              )}
            </div>

            {/* Delete Organization */}
            <div>
              <h4 className="text-sm font-semibold text-dark dark:text-light mb-2">
                {t("deleteOrganization")}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {canDelete ? t("deleteOrgWarning") : t("settings.deleteOrgDisabledReason")}
              </p>

              {showDeleteConfirm ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void handleDelete()}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    {t("confirmDeleteOrg")}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {tCommon("cancel")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting || !canDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("deleteOrganization")}
                </button>
              )}
            </div>
          </section>

          {/* Error message */}
          {error && (
            <p className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400" role="alert">
              <ErrorIcon className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("cancelButton")}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSubmitting || !hasChanges}
              className="px-6 py-2 bg-highlight hover:bg-highlight-hover text-dark font-bold rounded-lg
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon className="w-4 h-4" />
                  {t("settings.saving")}
                </>
              ) : (
                t("settings.saveButton")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
