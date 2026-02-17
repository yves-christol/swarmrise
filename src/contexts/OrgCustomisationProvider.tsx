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

export function OrgCustomisationProvider({ children }: { children: ReactNode }) {
  const { selectedOrga } = useSelectedOrga();
  const { resolvedTheme } = useTheme();

  const style = useMemo(() => {
    if (!selectedOrga) return undefined;

    const isDark = resolvedTheme === "dark";
    const paperColor = isDark
      ? selectedOrga.paperColorDark
      : selectedOrga.paperColorLight;
    const highlightColor = isDark
      ? selectedOrga.highlightColorDark
      : selectedOrga.highlightColorLight;

    const vars: Record<string, string> = {};

    if (paperColor) {
      vars["--org-paper-color"] = paperColor;
    }
    if (highlightColor) {
      vars["--org-highlight-color"] = highlightColor;
      vars["--org-highlight-hover"] = darkenHex(highlightColor, 0.15);
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
