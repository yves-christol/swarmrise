import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { EmailDomainsInput } from "../EmailDomainsInput";
import { SpinnerIcon, CheckIcon, XIcon, ErrorIcon } from "../Icons";
import { FONT_OPTIONS, ALL_GOOGLE_FONTS_URL } from "./fonts";
import { ACCENT_PRESETS } from "../../utils/colorPresets";
import { contrastRatio, getHslLightness } from "../../utils/colorContrast";

const arraysEqual = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const OrgPlaceholderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);

/** Traffic-light contrast feedback */
function ContrastBadge({ ratio }: { ratio: number }) {
  const { t } = useTranslation("orgs");
  if (ratio >= 4.5) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
        {t("settings.contrastGood")} ({ratio.toFixed(1)}:1)
      </span>
    );
  }
  if (ratio >= 3) {
    return (
      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        {t("settings.contrastOkHeadings")} ({ratio.toFixed(1)}:1)
      </span>
    );
  }
  return (
    <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
      {t("settings.contrastLow")} ({ratio.toFixed(1)}:1)
    </span>
  );
}

/** Lightness feedback for surface colors */
function LightnessBadge({ lightness, mode }: { lightness: number; mode: "light" | "dark" }) {
  const { t } = useTranslation("orgs");
  if (mode === "light") {
    if (lightness >= 85) return <span className="text-xs text-green-600 dark:text-green-400">{t("settings.lightnessGood")}</span>;
    if (lightness >= 70) return <span className="text-xs text-amber-600 dark:text-amber-400">{t("settings.lightnessCaution")}</span>;
    return <span className="text-xs text-red-600 dark:text-red-400">{t("settings.lightnessTooLow")}</span>;
  }
  // dark mode
  if (lightness <= 30) return <span className="text-xs text-green-600 dark:text-green-400">{t("settings.lightnessGood")}</span>;
  if (lightness <= 45) return <span className="text-xs text-amber-600 dark:text-amber-400">{t("settings.lightnessCaution")}</span>;
  return <span className="text-xs text-red-600 dark:text-red-400">{t("settings.lightnessTooHigh")}</span>;
}

/** Mini preview card for a color combination */
function PreviewCard({ surfaceColor, accentColor, label, fontFamily }: {
  surfaceColor: string;
  accentColor: string;
  label: string;
  fontFamily?: string;
}) {
  const { t } = useTranslation("orgs");
  const lum = (() => {
    const { r, g, b } = hexToRgbLocal(accentColor);
    const toLinear = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  })();
  const accentText = lum > 0.4 ? "#111111" : "#ffffff";
  const isDark = getHslLightness(surfaceColor) < 50;
  const textColor = isDark ? "#e5e7eb" : "#1f2937";
  const mutedColor = isDark ? "#9ca3af" : "#6b7280";
  const secondarySurface = isDark ? lightenLocal(surfaceColor, 0.08) : darkenLocal(surfaceColor, 0.04);

  return (
    <div className="flex-1 rounded-md overflow-hidden border border-border-default transition-colors" style={{ backgroundColor: surfaceColor }}>
      <div className="px-3 py-1.5">
        <p className="text-[10px] mb-1" style={{ color: mutedColor }}>{label}</p>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold truncate" style={{ color: textColor, fontFamily: fontFamily || undefined }}>
            {t("settings.previewOrgName")}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: accentColor, color: accentText }}>
            {t("settings.previewBadge")}
          </span>
        </div>
        <p className="text-[10px] mb-2" style={{ color: mutedColor }}>{t("settings.previewSecondary")}</p>
        <button
          type="button"
          className="text-[10px] px-2 py-0.5 rounded font-medium transition-colors"
          style={{ backgroundColor: accentColor, color: accentText }}
          tabIndex={-1}
        >
          {t("settings.previewButton")}
        </button>
      </div>
      <div className="px-3 py-1" style={{ backgroundColor: secondarySurface }}>
        <p className="text-[9px]" style={{ color: mutedColor }}>{t("settings.previewCaption")}</p>
      </div>
    </div>
  );
}

// Inline color helpers for the preview (avoid importing from provider to keep component self-contained)
function hexToRgbLocal(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}
function darkenLocal(hex: string, amount: number): string {
  const { r, g, b } = hexToRgbLocal(hex);
  const h = (n: number) => Math.round(n * (1 - amount)).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
function lightenLocal(hex: string, amount: number): string {
  const { r, g, b } = hexToRgbLocal(hex);
  const h = (n: number) => Math.round(n + (255 - n) * amount).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

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
  const [emailDomains, setEmailDomains] = useState<string[]>([]);

  // Appearance state
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [surfaceColorLight, setSurfaceColorLight] = useState<string | null>(null);
  const [surfaceColorDark, setSurfaceColorDark] = useState<string | null>(null);
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

      // Appearance — prefer new fields, fall back to legacy
      setAccentColor(orga.accentColor ?? orga.highlightColorLight ?? null);
      setSurfaceColorLight(orga.surfaceColorLight ?? orga.paperColorLight ?? null);
      setSurfaceColorDark(orga.surfaceColorDark ?? orga.paperColorDark ?? null);
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

  // Detect if form has changes
  const hasChanges = useMemo(() => {
    if (!orga) return false;

    const origAccent = orga.accentColor ?? orga.highlightColorLight ?? null;
    const origSurfaceLight = orga.surfaceColorLight ?? orga.paperColorLight ?? null;
    const origSurfaceDark = orga.surfaceColorDark ?? orga.paperColorDark ?? null;
    const originalDomains = orga.authorizedEmailDomains ?? [];

    return (
      name !== orga.name ||
      accentColor !== origAccent ||
      surfaceColorLight !== origSurfaceLight ||
      surfaceColorDark !== origSurfaceDark ||
      !arraysEqual(emailDomains, originalDomains) ||
      logoFile !== null ||
      logoRemoved ||
      titleFont !== (orga.titleFont ?? "")
    );
  }, [orga, name, accentColor, surfaceColorLight, surfaceColorDark, emailDomains, logoFile, logoRemoved, titleFont]);

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
      if (!trimmed) return t("validation.nameRequired");
      if (trimmed.length < 2) return t("validation.nameTooShort");
      if (trimmed.length > 100) return t("validation.nameTooLong");
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
    if (!validTypes.includes(file.type)) { setLogoUploadError(true); return; }
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setLogoRemoved(false);
    setLogoUploadError(false);
  };

  const handleRemoveLogo = () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoRemoved(true);
    setLogoUploadError(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadLogo = async (): Promise<Id<"_storage"> | null> => {
    if (!logoFile) return null;
    setIsUploadingLogo(true);
    try {
      const uploadUrl = await generateUploadUrl();
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

  const handleSave = async () => {
    const validationResult = validateName(name);
    if (validationResult) { setValidationError(validationResult); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      let logoStorageId: Id<"_storage"> | null | undefined;
      if (logoFile) {
        logoStorageId = await uploadLogo();
        if (!logoStorageId) { setError(t("logoUploadError")); setIsSubmitting(false); return; }
      } else if (logoRemoved) {
        logoStorageId = null;
      }

      const origAccent = orga?.accentColor ?? orga?.highlightColorLight ?? null;
      const origSurfaceLight = orga?.surfaceColorLight ?? orga?.paperColorLight ?? null;
      const origSurfaceDark = orga?.surfaceColorDark ?? orga?.paperColorDark ?? null;

      const args: Record<string, unknown> = { orgaId, name: name.trim() };
      if (logoStorageId !== undefined) args.logoStorageId = logoStorageId;
      if (emailDomains.length > 0) {
        args.authorizedEmailDomains = emailDomains;
      } else {
        args.authorizedEmailDomains = null;
      }

      // New color fields
      if (accentColor !== origAccent) args.accentColor = accentColor;
      if (surfaceColorLight !== origSurfaceLight) args.surfaceColorLight = surfaceColorLight;
      if (surfaceColorDark !== origSurfaceDark) args.surfaceColorDark = surfaceColorDark;
      if (titleFont !== (orga?.titleFont ?? "")) args.titleFont = titleFont || null;

      await updateOrga(args as Parameters<typeof updateOrga>[0]);
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
    try { await deleteOrga({ orgaId }); onClose(); } catch (err) {
      console.error("Failed to delete organization:", err);
      setError(t("errors.unknownError"));
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedNewOwnerId) return;
    setIsSubmitting(true);
    try { await transferOwnership({ orgaId, newOwnerMemberId: selectedNewOwnerId }); onClose(); } catch (err) {
      console.error("Failed to transfer ownership:", err);
      setError(t("errors.unknownError"));
    } finally { setIsSubmitting(false); }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) handleClose();
  };

  if (!isOpen) return null;

  const displayLogoUrl = logoPreviewUrl ?? (logoRemoved ? null : logoUrl);

  // Computed values for contrast display
  const effectiveAccent = accentColor ?? "#eac840";
  const effectiveSurfaceLight = surfaceColorLight ?? "#ffffff";
  const effectiveSurfaceDark = surfaceColorDark ?? "#1f2937";
  const accentOnLightRatio = contrastRatio(effectiveAccent, effectiveSurfaceLight);
  const accentOnDarkRatio = contrastRatio(effectiveAccent, effectiveSurfaceDark);

  // Any contrast issues?
  const hasContrastWarning = accentOnLightRatio < 3 || accentOnDarkRatio < 3
    || (surfaceColorLight !== null && getHslLightness(surfaceColorLight) < 70)
    || (surfaceColorDark !== null && getHslLightness(surfaceColorDark) > 45);

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
        className={`w-full max-w-lg mx-4 p-6 bg-surface-primary border-2 border-border-strong rounded-lg shadow-xl
          transition-all duration-150 ease-out max-h-[90vh] overflow-y-auto
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="settings-title" className="text-xl font-bold text-dark dark:text-light">
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
              <label htmlFor="org-name" className="text-sm font-bold text-dark dark:text-light">
                {t("organizationNameLabel")}
              </label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (validationError) setValidationError(null); }}
                onBlur={handleNameBlur}
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

            {/* Logo upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-dark dark:text-light">
                {t("logoLabel")}
              </label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-md bg-surface-tertiary flex items-center justify-center overflow-hidden flex-shrink-0 border border-border-strong">
                  {displayLogoUrl ? (
                    <img src={displayLogoUrl} alt="" className="w-full h-full object-contain" />
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
                      {displayLogoUrl ? t("logoChangeButton") : t("logoUploadButton")}
                    </button>
                    {displayLogoUrl && (
                      <button type="button" onClick={handleRemoveLogo} disabled={isSubmitting || isUploadingLogo}
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
          </section>

          {/* Appearance Section */}
          <section>
            <h3 className="text-lg font-semibold text-dark dark:text-light mb-4">
              {t("settings.appearanceSection")}
            </h3>

            {/* Accent Color */}
            <div className="flex flex-col gap-3 mb-5">
              <label className="text-sm font-bold text-dark dark:text-light">
                {t("settings.accentColorLabel")}
              </label>
              <p className="text-xs text-text-secondary">
                {t("settings.accentColorHint")}
              </p>

              {/* Preset row + custom picker */}
              <div className="flex items-center gap-2 flex-wrap">
                {ACCENT_PRESETS.map((preset) => {
                  const isSelected = accentColor === preset.color;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAccentColor(preset.color)}
                      disabled={isSubmitting}
                      className={`relative w-8 h-8 rounded-full border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                        ${isSelected ? "border-highlight ring-2 ring-highlight/30 scale-110" : "border-border-default hover:scale-105"}`}
                      style={{ backgroundColor: preset.color }}
                      aria-pressed={isSelected}
                      aria-label={t(preset.labelKey as never)}
                    >
                      {isSelected && <CheckIcon className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />}
                    </button>
                  );
                })}

                {/* Custom color picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={accentColor ?? "#eac840"}
                    onChange={(e) => setAccentColor(e.target.value)}
                    disabled={isSubmitting}
                    className="w-8 h-8 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-2 border-border-default"
                    aria-label={t("settings.customAccent")}
                  />
                </div>

                {accentColor && (
                  <button type="button" onClick={() => setAccentColor(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1">
                    {t("settings.resetColor")}
                  </button>
                )}
              </div>

              {/* Contrast feedback */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">{t("settings.contrastOnLight")}:</span>
                  <ContrastBadge ratio={accentOnLightRatio} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary">{t("settings.contrastOnDark")}:</span>
                  <ContrastBadge ratio={accentOnDarkRatio} />
                </div>
              </div>
            </div>

            {/* Background Colors */}
            <div className="flex flex-col gap-3 mb-5">
              <label className="text-sm font-bold text-dark dark:text-light">
                {t("settings.backgroundLabel")}
              </label>
              <p className="text-xs text-text-secondary">
                {t("settings.backgroundHint")}
              </p>
              <div className="flex gap-4">
                {/* Light mode */}
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="surface-color-light" className="text-xs text-text-secondary">
                    {t("settings.lightMode")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input id="surface-color-light" type="color" value={surfaceColorLight ?? "#ffffff"}
                      onChange={(e) => setSurfaceColorLight(e.target.value)} disabled={isSubmitting}
                      className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                    {surfaceColorLight && (
                      <button type="button" onClick={() => setSurfaceColorLight(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {t("settings.resetColor")}
                      </button>
                    )}
                  </div>
                  {surfaceColorLight && (
                    <LightnessBadge lightness={getHslLightness(surfaceColorLight)} mode="light" />
                  )}
                </div>
                {/* Dark mode */}
                <div className="flex-1 flex flex-col gap-1">
                  <label htmlFor="surface-color-dark" className="text-xs text-text-secondary">
                    {t("settings.darkMode")}
                  </label>
                  <div className="flex items-center gap-2">
                    <input id="surface-color-dark" type="color" value={surfaceColorDark ?? "#1f2937"}
                      onChange={(e) => setSurfaceColorDark(e.target.value)} disabled={isSubmitting}
                      className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                    {surfaceColorDark && (
                      <button type="button" onClick={() => setSurfaceColorDark(null)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        {t("settings.resetColor")}
                      </button>
                    )}
                  </div>
                  {surfaceColorDark && (
                    <LightnessBadge lightness={getHslLightness(surfaceColorDark)} mode="dark" />
                  )}
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="flex gap-3 mb-5" aria-label={t("settings.previewLabel")}>
              <PreviewCard
                surfaceColor={effectiveSurfaceLight}
                accentColor={effectiveAccent}
                label={t("settings.lightMode")}
                fontFamily={titleFont || undefined}
              />
              <PreviewCard
                surfaceColor={effectiveSurfaceDark}
                accentColor={effectiveAccent}
                label={t("settings.darkMode")}
                fontFamily={titleFont || undefined}
              />
            </div>

            {/* Title Font */}
            <div className="flex flex-col gap-3">
              <label htmlFor="title-font" className="text-sm font-bold text-dark dark:text-light">
                {t("settings.titleFontLabel")}
              </label>
              <p className="text-xs text-text-secondary">
                {t("settings.titleFontHint")}
              </p>
              <div className="flex items-center gap-2">
                <select id="title-font" value={titleFont} onChange={(e) => setTitleFont(e.target.value)} disabled={isSubmitting}
                  className="flex-1 px-3 py-2 rounded-md border border-border-strong bg-surface-primary text-dark dark:text-light text-sm focus:outline-none focus:ring-2 focus:ring-highlight disabled:opacity-50 disabled:cursor-not-allowed">
                  {FONT_OPTIONS.map((font) => (
                    <option key={font.value} value={font.value} style={font.value ? { fontFamily: font.value } : undefined}>
                      {font.value ? font.label : t("settings.titleFontDefault")}
                    </option>
                  ))}
                </select>
                {titleFont && (
                  <button type="button" onClick={() => setTitleFont("")}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {t("settings.resetColor")}
                  </button>
                )}
              </div>
              <div className="p-3 rounded-md bg-surface-secondary/50">
                <p className="text-lg font-semibold text-dark dark:text-light" style={titleFont ? { fontFamily: titleFont } : undefined}>
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
            <EmailDomainsInput domains={emailDomains} onChange={setEmailDomains} disabled={isSubmitting} />
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
              <p className="text-sm text-text-description mb-3">
                {t("settings.transferOwnershipDescription")}
              </p>
              {otherMembers.length === 0 ? (
                <p className="text-sm text-text-secondary italic">{t("settings.noOtherMembers")}</p>
              ) : showTransferConfirm ? (
                <div className="flex flex-col gap-3">
                  <select value={selectedNewOwnerId ?? ""} onChange={(e) => setSelectedNewOwnerId(e.target.value as Id<"members">)} disabled={isSubmitting}
                    className="px-3 py-2 rounded-md border border-border-strong bg-surface-primary text-dark dark:text-light text-sm focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="">{t("settings.selectNewOwner")}</option>
                    {otherMembers.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.firstname} {member.surname} ({member.email})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3">
                    <button onClick={() => void handleTransferOwnership()} disabled={isSubmitting || !selectedNewOwnerId}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting ? t("settings.transferring") : t("settings.confirmTransfer")}
                    </button>
                    <button onClick={() => { setShowTransferConfirm(false); setSelectedNewOwnerId(null); }} disabled={isSubmitting}
                      className="px-4 py-2 bg-surface-tertiary hover:bg-surface-hover-strong text-text-description rounded-lg transition-colors disabled:opacity-50">
                      {tCommon("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowTransferConfirm(true)} disabled={isSubmitting}
                  className="px-4 py-2 border border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50">
                  {t("settings.transferOwnership")}
                </button>
              )}
            </div>

            {/* Delete Organization */}
            <div>
              <h4 className="text-sm font-semibold text-dark dark:text-light mb-2">{t("deleteOrganization")}</h4>
              <p className="text-sm text-text-description mb-3">
                {canDelete ? t("deleteOrgWarning") : t("settings.deleteOrgDisabledReason")}
              </p>
              {showDeleteConfirm ? (
                <div className="flex items-center gap-3">
                  <button onClick={() => void handleDelete()} disabled={isSubmitting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50">
                    {t("confirmDeleteOrg")}
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} disabled={isSubmitting}
                    className="px-4 py-2 bg-surface-tertiary hover:bg-surface-hover-strong text-text-description rounded-lg transition-colors disabled:opacity-50">
                    {tCommon("cancel")}
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowDeleteConfirm(true)} disabled={isSubmitting || !canDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
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
            <button type="button" onClick={handleClose} disabled={isSubmitting}
              className="px-4 py-2 text-text-secondary hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {t("cancelButton")}
            </button>
            <button type="button" onClick={() => void handleSave()} disabled={isSubmitting || !hasChanges}
              className="px-6 py-2 bg-highlight hover:bg-highlight-hover text-dark font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {hasContrastWarning && !isSubmitting && (
                <svg className="w-4 h-4 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              )}
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
