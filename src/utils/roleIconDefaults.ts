/**
 * Inline SVG paths for the 4 default role icons.
 * The full icon dictionary (~448 icons, ~460KB) is loaded lazily
 * only when needed, keeping it out of the critical render path.
 */
const DEFAULT_ICON_PATHS: Record<string, string> = {
  rond: "M 0,20 a 20,20 0 1,0 40,0 a 20,20 0 1,0 -40,0 z",
  fivestar:
    "M 38,16.019 24.373,16 20,3 15.627,16 2,16.019 12.925,24.299 8.832,37.371 20,29.438 31.168,37.371 27.074,24.299 Z",
  poetry:
    "M36.801,4.39C35.157,2.627,33,2,30,2c-7.631,0-13.682,4.67-19.403,13.967c-1.351,2.195-2.089,4.348-2.405,7.216 c-2.575,4.373-4.479,8.484-5.532,11.375C2.229,35.741,2,36.667,2,36.667L4,38l5.525-3.885c0,0,0.332-0.987,0.606-1.706 c0.449-1.173,1.257-3.156,2.43-5.577C15.714,26.617,19.438,26.125,20,25c5.207-10.415,9.245-16.363,13-16.363    C34.125,8.637,35,9,36,9c1.339,0,1.976-0.852,2-1.847C38.023,6.212,37.616,5.265,36.801,4.39z M14.413,19.638    C10.07,26.789,8,33,8,33l-4,2.917c1.107-3.322,4.36-10.297,9.08-17.049C16.885,13.424,21.798,6.463,28,5    C21.977,7.5,17.464,14.614,14.413,19.638z",
  mallet:
    "M24.657,6.857l-7.071,7.071l-1.413-1.413c0,0-1.416-1.415-0.001-2.83l4.243-4.243c0,0,1.415-1.414,2.828,0.001L24.657,6.857  z M33.145,15.345l-7.072,7.068l1.416,1.415c0,0,1.412,1.413,2.826-0.001l4.243-4.242c0,0,1.413-1.414-0.001-2.828L33.145,15.345z   M29.607,11.808l1.414-1.414l-1.414-1.414l-1.414,1.414l-2.121-2.121L19,15.343l2.121,2.121L5.563,30.189l4.246,4.245l12.727-15.557  L24.657,21l7.071-7.071L29.607,11.808z",
};

/** Full icon dictionary, loaded lazily on first access */
let fullIconDict: Record<string, { path: string }> | null = null;

// Eagerly trigger the async load (non-blocking) so it's ready by the time
// a user navigates to a view with custom role icons.
void import("../components/Icons/icons").then((m) => {
  fullIconDict = m.iconDict;
});

export function getDefaultIconKey(
  roleType?: "leader" | "secretary" | "referee"
): string {
  switch (roleType) {
    case "leader":
      return "fivestar";
    case "secretary":
      return "poetry";
    case "referee":
      return "mallet";
    default:
      return "rond";
  }
}

/**
 * Returns the SVG path string for a role, with fallback chain:
 * explicit iconKey -> role type default -> "rond"
 */
export function getRoleIconPath(
  iconKey?: string,
  roleType?: "leader" | "secretary" | "referee"
): string {
  const key = iconKey ?? getDefaultIconKey(roleType);
  // Fast path: check inline defaults first
  if (key in DEFAULT_ICON_PATHS) return DEFAULT_ICON_PATHS[key];
  // Lazy path: check full dictionary (may not be loaded yet)
  return fullIconDict?.[key]?.path ?? DEFAULT_ICON_PATHS["rond"];
}
