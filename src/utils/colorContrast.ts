/** Parse hex "#RRGGBB" to {r,g,b} */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

/** Compute relative luminance (WCAG formula) */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Compute contrast ratio between two hex colors */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Get HSL lightness (0-100) from a hex color */
export function getHslLightness(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return Math.round(((max + min) / 2) * 100);
}

/** Darken a hex color by mixing with black (0-1 factor, 0.15 = 15% darker) */
export function darkenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (n: number) => Math.round(n * (1 - amount)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Lighten a hex color by mixing with white (0-1 factor, 0.15 = 15% lighter) */
export function lightenHex(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const toHex = (n: number) => Math.round(n + (255 - n) * amount).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
