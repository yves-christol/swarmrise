/**
 * Default icon keys for each role type.
 * Used by both createRole and createTeam mutations.
 */
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
