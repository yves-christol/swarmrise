import { iconDict } from "../components/Icons/icons";

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
  return iconDict[key]?.path ?? iconDict["rond"].path;
}
