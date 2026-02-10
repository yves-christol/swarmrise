import type { ReactNode } from "react";

/**
 * Renders text with any occurrence of "swarmrise" styled in the brand font.
 * Splits the input text on "swarmrise" (case-insensitive match, but always
 * renders as lowercase "swarmrise") and wraps each occurrence in a span
 * with the brand font class and gold color.
 */
export const renderBrandText = (text: string): ReactNode[] => {
  const parts = text.split("swarmrise");
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && (
        <span className="font-swarm text-gold">swarmrise</span>
      )}
    </span>
  ));
};
