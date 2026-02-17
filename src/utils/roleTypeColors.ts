type RoleType = "leader" | "secretary" | "referee";

export function getRoleStroke(roleType?: RoleType, isDaughterTeamSource?: boolean): string {
  if (isDaughterTeamSource) {
    return "var(--diagram-golden-bee)";
  }
  switch (roleType) {
    case "leader":
      return "var(--diagram-golden-bee)";
    case "secretary":
      return "#a2dbed"; // Wing Blue
    case "referee":
      return "#a78bfa"; // Purple-400
    default:
      return "var(--diagram-node-stroke)";
  }
}

export function getRoleTypeBadgeColor(roleType: RoleType): string {
  switch (roleType) {
    case "leader":
      return "var(--diagram-golden-bee)";
    case "secretary":
      return "#7dd3fc"; // Light Blue
    case "referee":
      return "#c4b5fd"; // Light Purple
  }
}
