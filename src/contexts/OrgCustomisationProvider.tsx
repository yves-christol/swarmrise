import { useEffect, useMemo, type ReactNode } from "react";
import { useSelectedOrga } from "../tools/orgaStore";
import { useTheme } from "./ThemeContext";
import type { RgbColor } from "../../convex/orgas";
import { FONT_OPTIONS } from "../components/OrgaSettingsModal/fonts";

function rgbToString(color: RgbColor): string {
  return `${color.r}, ${color.g}, ${color.b}`;
}

/** Darken an RGB color by mixing with black (0-1 factor, 0.15 = 15% darker) */
function darken(color: RgbColor, amount: number): RgbColor {
  return {
    r: Math.round(color.r * (1 - amount)),
    g: Math.round(color.g * (1 - amount)),
    b: Math.round(color.b * (1 - amount)),
  };
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
      vars["--org-paper-color"] = `rgb(${rgbToString(paperColor)})`;
    }
    if (highlightColor) {
      vars["--org-highlight-color"] = `rgb(${rgbToString(highlightColor)})`;
      vars["--org-highlight-hover"] = `rgb(${rgbToString(darken(highlightColor, 0.15))})`;
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
