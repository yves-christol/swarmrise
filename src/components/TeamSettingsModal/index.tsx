import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type RGB = { r: number; g: number; b: number };

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

const rgbEqual = (a: RGB | null | undefined, b: RGB | null | undefined): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.r === b.r && a.g === b.g && a.b === b.b;
};

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

  const [colorLight, setColorLight] = useState<RGB | null>(null);
  const [colorDark, setColorDark] = useState<RGB | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize from team data
  useEffect(() => {
    if (team && isOpen) {
      setColorLight(team.colorLight ?? null);
      setColorDark(team.colorDark ?? null);
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
    ? !rgbEqual(colorLight, team.colorLight) || !rgbEqual(colorDark, team.colorDark)
    : false;

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
        colorLight: colorLight ?? null,
        colorDark: colorDark ?? null,
      });
      onClose();
    } catch (err) {
      console.error("Failed to update team colors:", err);
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
        className={`w-full max-w-md mx-4 p-6 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-700 rounded-lg shadow-xl
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("manage.teamColorHint")}
          </p>

          <div className="flex gap-4">
            {/* Light mode */}
            <div className="flex-1 flex flex-col gap-1">
              <label htmlFor="team-color-light" className="text-xs text-gray-500 dark:text-gray-400">
                {t("manage.lightMode")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="team-color-light"
                  type="color"
                  value={colorLight ? rgbToHex(colorLight) : "#888888"}
                  onChange={(e) => setColorLight(hexToRgb(e.target.value))}
                  disabled={isSubmitting}
                  className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {colorLight && (
                  <button
                    type="button"
                    onClick={() => setColorLight(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {t("manage.resetColor")}
                  </button>
                )}
              </div>
            </div>

            {/* Dark mode */}
            <div className="flex-1 flex flex-col gap-1">
              <label htmlFor="team-color-dark" className="text-xs text-gray-500 dark:text-gray-400">
                {t("manage.darkMode")}
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="team-color-dark"
                  type="color"
                  value={colorDark ? rgbToHex(colorDark) : "#888888"}
                  onChange={(e) => setColorDark(hexToRgb(e.target.value))}
                  disabled={isSubmitting}
                  className="w-10 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {colorDark && (
                  <button
                    type="button"
                    onClick={() => setColorDark(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {t("manage.resetColor")}
                  </button>
                )}
              </div>
            </div>
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
              className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              {t("manage.cancel")}
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSubmitting || !hasChanges}
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
