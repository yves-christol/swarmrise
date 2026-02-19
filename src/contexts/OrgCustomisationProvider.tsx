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
    // We set BOTH intermediate vars (--org-paper-color, --surface-*, etc.)
    // AND the final @theme-level vars (--color-surface-*, --color-border-*, etc.)
    // because CSS custom properties resolve var() eagerly at computed-value time.
    // The @theme vars on :root (e.g. --color-surface-primary: var(--surface-primary))
    // are resolved before inline styles take effect, so we must override them directly.
    if (surfaceColor) {
      vars["--org-paper-color"] = surfaceColor;
      vars["--color-surface-primary"] = surfaceColor;

      if (isDark) {
        const secondary = lightenHex(surfaceColor, 0.08);
        const tertiary = lightenHex(surfaceColor, 0.15);
        vars["--org-paper-color-secondary"] = secondary;
        vars["--org-paper-color-tertiary"] = tertiary;
        vars["--color-surface-secondary"] = secondary;
        vars["--color-surface-tertiary"] = tertiary;

        const hoverSubtle = lightenHex(surfaceColor, 0.05);
        const hover = lightenHex(surfaceColor, 0.10);
        const hoverStrong = lightenHex(surfaceColor, 0.18);
        vars["--surface-hover-subtle"] = hoverSubtle;
        vars["--surface-hover"] = hover;
        vars["--surface-hover-strong"] = hoverStrong;
        vars["--color-surface-hover-subtle"] = hoverSubtle;
        vars["--color-surface-hover"] = hover;
        vars["--color-surface-hover-strong"] = hoverStrong;

        const bDefault = lightenHex(surfaceColor, 0.12);
        const bStrong = lightenHex(surfaceColor, 0.20);
        vars["--border-default"] = bDefault;
        vars["--border-strong"] = bStrong;
        vars["--color-border-default"] = bDefault;
        vars["--color-border-strong"] = bStrong;

        const tSecondary = lightenHex(surfaceColor, 0.50);
        const tTertiary = lightenHex(surfaceColor, 0.30);
        vars["--text-secondary"] = tSecondary;
        vars["--text-description"] = tSecondary;
        vars["--text-tertiary"] = tTertiary;
        vars["--color-text-secondary"] = tSecondary;
        vars["--color-text-description"] = tSecondary;
        vars["--color-text-tertiary"] = tTertiary;
      } else {
        const secondary = darkenHex(surfaceColor, 0.04);
        const tertiary = darkenHex(surfaceColor, 0.08);
        vars["--org-paper-color-secondary"] = secondary;
        vars["--org-paper-color-tertiary"] = tertiary;
        vars["--color-surface-secondary"] = secondary;
        vars["--color-surface-tertiary"] = tertiary;

        const hoverSubtle = darkenHex(surfaceColor, 0.02);
        const hover = darkenHex(surfaceColor, 0.05);
        const hoverStrong = darkenHex(surfaceColor, 0.10);
        vars["--surface-hover-subtle"] = hoverSubtle;
        vars["--surface-hover"] = hover;
        vars["--surface-hover-strong"] = hoverStrong;
        vars["--color-surface-hover-subtle"] = hoverSubtle;
        vars["--color-surface-hover"] = hover;
        vars["--color-surface-hover-strong"] = hoverStrong;

        const bDefault = darkenHex(surfaceColor, 0.12);
        const bStrong = darkenHex(surfaceColor, 0.18);
        vars["--border-default"] = bDefault;
        vars["--border-strong"] = bStrong;
        vars["--color-border-default"] = bDefault;
        vars["--color-border-strong"] = bStrong;

        const tSecondary = darkenHex(surfaceColor, 0.45);
        const tDescription = darkenHex(surfaceColor, 0.55);
        const tTertiary = darkenHex(surfaceColor, 0.30);
        vars["--text-secondary"] = tSecondary;
        vars["--text-description"] = tDescription;
        vars["--text-tertiary"] = tTertiary;
        vars["--color-text-secondary"] = tSecondary;
        vars["--color-text-description"] = tDescription;
        vars["--color-text-tertiary"] = tTertiary;
      }
    }

    // Accent color → derive highlight tokens
    if (accentColor) {
      const accentHover = darkenHex(accentColor, 0.15);
      vars["--org-highlight-color"] = accentColor;
      vars["--org-highlight-hover"] = accentHover;
      vars["--color-highlight"] = accentColor;
      vars["--color-highlight-hover"] = accentHover;

      // Auto-compute text-on-accent (white or dark)
      const lum = relativeLuminance(accentColor);
      const accentText = lum > 0.4 ? "#111111" : "#ffffff";
      vars["--accent-text"] = accentText;
      vars["--color-accent-text"] = accentText;

      // Gold text and diagram tokens (also use var() indirection from :root)
      if (isDark) {
        vars["--color-gold-text"] = accentColor;
        vars["--diagram-golden-bee"] = accentColor;
      } else {
        vars["--diagram-golden-bee"] = accentHover;
      }
    }

    if (selectedOrga.titleFont) {
      vars["--org-title-font"] = selectedOrga.titleFont;
    }

    return Object.keys(vars).length > 0 ? vars : undefined;
  }, [selectedOrga, resolvedTheme]);

  // Mirror org CSS vars onto :root so that portaled elements (modals, chat panel)
  // that escape the provider wrapper div still inherit the org's custom colours.
  useEffect(() => {
    const root = document.documentElement;
    if (!style) return;

    const keys = Object.keys(style);
    for (const key of keys) {
      root.style.setProperty(key, style[key]);
    }

    return () => {
      for (const key of keys) {
        root.style.removeProperty(key);
      }
    };
  }, [style]);

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
