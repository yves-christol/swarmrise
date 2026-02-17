import { useMemo, type ReactNode } from "react";
import { useSelectedOrga } from "../tools/orgaStore";
import { useTheme } from "./ThemeContext";
import type { RgbColor } from "../../convex/orgas";

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

  return <div style={style}>{children}</div>;
}
