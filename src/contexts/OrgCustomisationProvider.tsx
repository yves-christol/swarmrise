import { useEffect, useMemo, type ReactNode } from "react";
import { useSelectedOrga } from "../tools/orgaStore";
import { useTheme } from "./ThemeContext";
import { FONT_OPTIONS } from "../components/OrgaSettingsModal/fonts";

/** Parse hex "#RRGGBB" to {r,g,b} for CSS manipulation */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

/** Darken a hex color by mixing with black (0-1 factor, 0.15 = 15% darker) */
function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (n: number) => Math.round(n * (1 - amount)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Lighten a hex color by mixing with white (0-1 factor, 0.15 = 15% lighter) */
function lightenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (n: number) => Math.round(n + (255 - n) * amount).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Compute relative luminance (WCAG formula) */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}


export function OrgCustomisationProvider({ children }: { children: ReactNode }) {
  const { selectedOrga } = useSelectedOrga();
  const { resolvedTheme } = useTheme();

  const style = useMemo(() => {
    if (!selectedOrga) return undefined;

    const isDark = resolvedTheme === "dark";

    // Read new fields with fallback to legacy fields
    const surfaceColor = isDark
      ? (selectedOrga.surfaceColorDark ?? selectedOrga.paperColorDark)
      : (selectedOrga.surfaceColorLight ?? selectedOrga.paperColorLight);

    const accentColor = selectedOrga.accentColor
      ?? (isDark ? selectedOrga.highlightColorDark : selectedOrga.highlightColorLight);

    const vars: Record<string, string> = {};

    // Surface color → derive all surface tokens
    if (surfaceColor) {
      vars["--org-paper-color"] = surfaceColor;

      if (isDark) {
        vars["--org-paper-color-secondary"] = lightenHex(surfaceColor, 0.08);
        vars["--org-paper-color-tertiary"] = lightenHex(surfaceColor, 0.15);
        vars["--surface-hover-subtle"] = lightenHex(surfaceColor, 0.05);
        vars["--surface-hover"] = lightenHex(surfaceColor, 0.10);
        vars["--surface-hover-strong"] = lightenHex(surfaceColor, 0.18);
        vars["--border-default"] = lightenHex(surfaceColor, 0.12);
        vars["--border-strong"] = lightenHex(surfaceColor, 0.20);
        vars["--text-secondary"] = lightenHex(surfaceColor, 0.50);
        vars["--text-description"] = lightenHex(surfaceColor, 0.50);
        vars["--text-tertiary"] = lightenHex(surfaceColor, 0.30);
      } else {
        vars["--org-paper-color-secondary"] = darkenHex(surfaceColor, 0.04);
        vars["--org-paper-color-tertiary"] = darkenHex(surfaceColor, 0.08);
        vars["--surface-hover-subtle"] = darkenHex(surfaceColor, 0.02);
        vars["--surface-hover"] = darkenHex(surfaceColor, 0.05);
        vars["--surface-hover-strong"] = darkenHex(surfaceColor, 0.10);
        vars["--border-default"] = darkenHex(surfaceColor, 0.12);
        vars["--border-strong"] = darkenHex(surfaceColor, 0.18);
        vars["--text-secondary"] = darkenHex(surfaceColor, 0.45);
        vars["--text-description"] = darkenHex(surfaceColor, 0.55);
        vars["--text-tertiary"] = darkenHex(surfaceColor, 0.30);
      }
    }

    // Accent color → derive highlight tokens
    if (accentColor) {
      vars["--org-highlight-color"] = accentColor;
      vars["--org-highlight-hover"] = darkenHex(accentColor, 0.15);

      // Auto-compute text-on-accent (white or dark)
      const lum = relativeLuminance(accentColor);
      vars["--accent-text"] = lum > 0.4 ? "#111111" : "#ffffff";
    }

    if (selectedOrga.titleFont) {
      vars["--org-title-font"] = selectedOrga.titleFont;
    }

    return Object.keys(vars).length > 0 ? vars : undefined;
  }, [selectedOrga, resolvedTheme]);

  // Load Google Font when titleFont changes
  useEffect(() => {
    if (!selectedOrga?.titleFont) return;
    const font = FONT_OPTIONS.find((f) => f.value === selectedOrga.titleFont);
    if (!font || font.source !== "google" || !font.googleFamily) return;

    const linkId = `google-font-${font.googleFamily}`;
    if (document.getElementById(linkId)) return;

    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${font.googleFamily}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);

    return () => {
      document.getElementById(linkId)?.remove();
    };
  }, [selectedOrga?.titleFont]);

  return <div className="contents" style={style}>{children}</div>;
}
