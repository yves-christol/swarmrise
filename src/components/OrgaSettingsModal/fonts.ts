export type FontOption = {
  value: string; // CSS font-family value stored in DB
  label: string; // Display name
  source: "system" | "google";
  googleFamily?: string; // Google Fonts family param (e.g. "Playfair+Display")
};

export const FONT_OPTIONS: FontOption[] = [
  // Default (uses CSS fallback)
  { value: "", label: "Default (Arial)", source: "system" },
  // System fonts
  { value: "Georgia, serif", label: "Georgia", source: "system" },
  { value: "'Times New Roman', serif", label: "Times New Roman", source: "system" },
  { value: "Verdana, sans-serif", label: "Verdana", source: "system" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet MS", source: "system" },
  { value: "'Courier New', monospace", label: "Courier New", source: "system" },
  // Google Fonts (curated titles-appropriate selection)
  { value: "'Inter', sans-serif", label: "Inter", source: "google", googleFamily: "Inter" },
  { value: "'Lato', sans-serif", label: "Lato", source: "google", googleFamily: "Lato" },
  { value: "'Poppins', sans-serif", label: "Poppins", source: "google", googleFamily: "Poppins" },
  { value: "'Raleway', sans-serif", label: "Raleway", source: "google", googleFamily: "Raleway" },
  { value: "'Playfair Display', serif", label: "Playfair Display", source: "google", googleFamily: "Playfair+Display" },
  { value: "'Merriweather', serif", label: "Merriweather", source: "google", googleFamily: "Merriweather" },
  { value: "'Nunito', sans-serif", label: "Nunito", source: "google", googleFamily: "Nunito" },
  { value: "'Oswald', sans-serif", label: "Oswald", source: "google", googleFamily: "Oswald" },
];

/** Google Fonts URL to preload all curated fonts for the picker preview */
export const ALL_GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=" +
  FONT_OPTIONS.filter((f) => f.googleFamily)
    .map((f) => `${f.googleFamily}:wght@400;600;700`)
    .join("&family=") +
  "&display=swap";
