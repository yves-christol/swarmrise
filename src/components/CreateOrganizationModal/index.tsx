import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useOrgaStore } from "../../tools/orgaStore";
import { Id } from "../../../convex/_generated/dataModel";
import { EmailDomainsInput } from "../EmailDomainsInput";

type RGB = { r: number; g: number; b: number };
type ColorScheme = { primary: RGB; secondary: RGB };

// Color presets
const COLOR_PRESETS: { id: string; primary: RGB; secondary: RGB }[] = [
  // Gold/Blue (swarmrise default)
  { id: "gold-blue", primary: { r: 234, g: 200, b: 64 }, secondary: { r: 162, g: 219, b: 237 } },
  // Forest Green/Stone Gray
  { id: "green-gray", primary: { r: 34, g: 139, b: 34 }, secondary: { r: 169, g: 169, b: 169 } },
  // Ocean Blue/Warm Gold
  { id: "blue-gold", primary: { r: 30, g: 144, b: 255 }, secondary: { r: 255, g: 193, b: 37 } },
  // Royal Purple/Sky Cyan
  { id: "purple-cyan", primary: { r: 138, g: 43, b: 226 }, secondary: { r: 0, g: 206, b: 209 } },
  // Coral Red/Cool Gray
  { id: "red-gray", primary: { r: 255, g: 99, b: 71 }, secondary: { r: 112, g: 128, b: 144 } },
];

const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
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

const ErrorIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
      clipRule="evenodd"
    />
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
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

  const [name, setName] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState("gold-blue");
  const [customPrimary, setCustomPrimary] = useState<RGB>(COLOR_PRESETS[0].primary);
  const [customSecondary, setCustomSecondary] = useState<RGB>(COLOR_PRESETS[0].secondary);
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

  // Get current color scheme
  const getColorScheme = useCallback((): ColorScheme => {
    if (selectedPresetId === "custom") {
      return { primary: customPrimary, secondary: customSecondary };
    }
    const preset = COLOR_PRESETS.find((p) => p.id === selectedPresetId);
    return preset
      ? { primary: preset.primary, secondary: preset.secondary }
      : { primary: COLOR_PRESETS[0].primary, secondary: COLOR_PRESETS[0].secondary };
  }, [selectedPresetId, customPrimary, customSecondary]);

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
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setName("");
        setSelectedPresetId("gold-blue");
        setCustomPrimary(COLOR_PRESETS[0].primary);
        setCustomSecondary(COLOR_PRESETS[0].secondary);
        setError(null);
        setValidationError(null);
        setIsSubmitting(false);
        setShowAdvanced(false);
        setFirstTeamName("");
        setAuthorizedEmailDomains([]);
        // Clean up logo preview URL
        if (logoPreviewUrl) {
          URL.revokeObjectURL(logoPreviewUrl);
        }
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

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setLogoUploadError(true);
      return;
    }

    // Create preview URL
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    const previewUrl = URL.createObjectURL(file);

    setLogoFile(file);
    setLogoPreviewUrl(previewUrl);
    setLogoUploadError(false);
  };

  // Remove selected file
  const handleRemoveFile = () => {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoUploadError(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Upload file to Convex storage
  const uploadLogo = async (): Promise<Id<"_storage"> | null> => {
    if (!logoFile) return null;

    setIsUploadingLogo(true);
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();

      // Upload the file
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = validateName(name);
    if (validationResult) {
      setValidationError(validationResult);
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const colorScheme = getColorScheme();
    const trimmedFirstTeamName = firstTeamName.trim();

    // Upload logo first if selected, then create organization
    uploadLogo()
      .then((logoStorageId) => {
        if (logoFile && !logoStorageId) {
          // Logo upload failed
          setError(t("logoUploadError"));
          setIsSubmitting(false);
          return;
        }

        return createOrganization({
          name: name.trim(),
          colorScheme,
          ...(logoStorageId && { logoStorageId }),
          ...(trimmedFirstTeamName && { firstTeamName: trimmedFirstTeamName }),
          ...(authorizedEmailDomains.length > 0 && { authorizedEmailDomains }),
        });
      })
      .then((orgaId) => {
        if (orgaId) {
          selectOrga(orgaId);
          onClose();
        }
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

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = COLOR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setCustomPrimary(preset.primary);
      setCustomSecondary(preset.secondary);
    }
  };

  const handleCustomColorChange = (type: "primary" | "secondary", hex: string) => {
    const rgb = hexToRgb(hex);
    if (type === "primary") {
      setCustomPrimary(rgb);
    } else {
      setCustomSecondary(rgb);
    }
    setSelectedPresetId("custom");
  };

  if (!isOpen) return null;

  const currentColors = getColorScheme();

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
        aria-labelledby="modal-title"
        className={`w-full max-w-md mx-4 p-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] overflow-y-auto
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
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

          {/* Color scheme picker */}
          <div className="flex flex-col gap-3">
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
                    ${
                      selectedPresetId === preset.id
                        ? "border-[#eac840] ring-2 ring-[#eac840]/30"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  aria-pressed={selectedPresetId === preset.id}
                  aria-label={t(`presets.${preset.id}`)}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-500"
                    style={{ backgroundColor: rgbToHex(preset.primary) }}
                  />
                  <div
                    className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-500"
                    style={{ backgroundColor: rgbToHex(preset.secondary) }}
                  />
                  {selectedPresetId === preset.id && (
                    <CheckIcon className="absolute -top-1 -right-1 w-4 h-4 text-[#eac840] bg-white dark:bg-gray-800 rounded-full" />
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
                  ${
                    selectedPresetId === "custom"
                      ? "border-[#eac840] ring-2 ring-[#eac840]/30"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                aria-pressed={selectedPresetId === "custom"}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("customColors")}
                </span>
                {selectedPresetId === "custom" && (
                  <CheckIcon className="absolute -top-1 -right-1 w-4 h-4 text-[#eac840] bg-white dark:bg-gray-800 rounded-full" />
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
                    value={rgbToHex(customPrimary)}
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
                    value={rgbToHex(customSecondary)}
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
                  style={{ backgroundColor: rgbToHex(currentColors.primary) }}
                />
                <div
                  className="flex-1 h-3 rounded-full transition-colors"
                  style={{ backgroundColor: rgbToHex(currentColors.secondary) }}
                />
              </div>
            </div>
          </div>

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isSubmitting}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            />
            {t("advancedOptions")}
          </button>

          {/* Advanced options section */}
          {showAdvanced && (
            <div className="flex flex-col gap-4 p-4 rounded-md bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600">
              {/* Logo upload */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-dark dark:text-light">
                  {t("logoLabel")}
                </label>
                <div className="flex items-center gap-3">
                  {/* Logo preview */}
                  <div className="w-14 h-14 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-300 dark:border-gray-500">
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
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
                        {logoFile ? t("logoChangeButton") : t("logoUploadButton")}
                      </button>
                      {logoFile && (
                        <button
                          type="button"
                          onClick={handleRemoveFile}
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

              {/* First team name */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="first-team-name"
                  className="text-sm font-medium text-dark dark:text-light"
                >
                  {t("firstTeamNameLabel")}
                </label>
                <input
                  id="first-team-name"
                  type="text"
                  value={firstTeamName}
                  onChange={(e) => setFirstTeamName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={name || t("firstTeamNamePlaceholder")}
                  className="px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600
                    bg-white dark:bg-gray-900 text-dark dark:text-light text-sm
                    focus:outline-none focus:ring-2 focus:ring-[#eac840] transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-400">{t("firstTeamNameHint")}</p>
              </div>

              {/* Authorized email domains */}
              <EmailDomainsInput
                domains={authorizedEmailDomains}
                onChange={setAuthorizedEmailDomains}
                disabled={isSubmitting}
                compact
              />
            </div>
          )}

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
          <div className="flex justify-end gap-3 pt-2">
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
