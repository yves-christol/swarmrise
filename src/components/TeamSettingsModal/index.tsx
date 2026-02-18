import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * Convert a hex color string to HSL values.
 * Returns { h: 0-360, s: 0-100, l: 0-100 }.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 50 };

  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Validate that a hex color meets the HSL constraints:
 * - Saturation >= 30%
 * - Lightness between 25% and 75%
 */
function validateColor(hex: string): { valid: boolean; reason?: "saturation" | "lightness" } {
  const { s, l } = hexToHsl(hex);
  if (s < 30) return { valid: false, reason: "saturation" };
  if (l < 25 || l > 75) return { valid: false, reason: "lightness" };
  return { valid: true };
}

type TeamSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  teamId: Id<"teams">;
};

export function TeamSettingsModal({ isOpen, onClose, teamId }: TeamSettingsModalProps) {
  const { t } = useTranslation("teams");
  const { t: tCommon } = useTranslation("common");

  const team = useQuery(api.teams.functions.getTeamById, { teamId });
  const updateTeam = useMutation(api.teams.functions.updateTeam);

  const [color, setColor] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize from team data
  useEffect(() => {
    if (team && isOpen) {
      setColor(team.color ?? null);
      setError(null);
    }
  }, [team, isOpen]);

  // Handle open/close animation
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const hasChanges = team
    ? color !== (team.color ?? null)
    : false;

  // HSL validation for the current color
  const colorValidation = color ? validateColor(color) : null;
  const isColorInvalid = colorValidation !== null && !colorValidation.valid;

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

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateTeam({
        teamId,
        color: color ?? null,
      });
      onClose();
    } catch (err) {
      console.error("Failed to update team color:", err);
      setError(err instanceof Error ? err.message : t("manage.failedToUpdate"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose();
    }
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
        aria-labelledby="team-settings-title"
        className={`w-full max-w-md mx-4 p-6 bg-surface-primary border-2 border-border-strong rounded-lg shadow-xl
          transition-all duration-150 ease-out
          ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 id="team-settings-title" className="text-xl font-bold text-dark dark:text-light">
            {t("manage.teamColor")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label={tCommon("close")}
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary">
            {t("manage.teamColorHint")}
          </p>

          {/* Single color picker */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <input
                id="team-color"
                type="color"
                value={color ?? "#888888"}
                onChange={(e) => setColor(e.target.value)}
                disabled={isSubmitting}
                className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                aria-describedby={isColorInvalid ? "color-validation-message" : undefined}
              />
              <span className="text-sm font-mono text-text-secondary">
                {color ?? "--"}
              </span>
              {color && (
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {t("manage.resetColor")}
                </button>
              )}
            </div>

            {/* HSL validation message */}
            {isColorInvalid && colorValidation.reason && (
              <p
                id="color-validation-message"
                className="text-xs text-amber-600 dark:text-amber-400"
                role="alert"
              >
                {colorValidation.reason === "saturation"
                  ? t("manage.colorValidation.saturation")
                  : t("manage.colorValidation.lightness")}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-text-secondary hover:text-gray-700  dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {t("manage.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSubmitting || !hasChanges || isColorInvalid}
              className="px-6 py-2 bg-highlight hover:bg-highlight-hover text-dark font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "..." : t("manage.save")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
