import type { Decision } from "../../../convex/decisions";

export type { Decision };

type Diff = Decision["diff"];

/**
 * Get the i18n key and interpolation params for a decision summary.
 * Returns { key, params } to be used with t(key, params).
 */
export function getDecisionSummaryKey(
  decision: Decision
): { key: string; params?: Record<string, string> } {
  const diff = decision.diff;

  switch (diff.type) {
    case "Organization": {
      if (!diff.before) return { key: "summary.orgCreated" };
      return { key: "summary.orgUpdated" };
    }
    case "Team": {
      const name = diff.after?.name ?? diff.before?.name ?? "";
      if (!diff.before) return { key: "summary.teamCreated", params: { name } };
      if (!diff.after) return { key: "summary.teamRemoved", params: { name } };
      return { key: "summary.teamUpdated", params: { name } };
    }
    case "Role": {
      const title = diff.after?.title ?? diff.before?.title ?? "";
      if (!diff.before) return { key: "summary.roleCreated", params: { title } };
      if (!diff.after) return { key: "summary.roleRemoved", params: { title } };
      return { key: "summary.roleUpdated", params: { title } };
    }
    case "Invitation": {
      const email = diff.after?.email ?? diff.before?.email ?? "";
      if (!diff.before) return { key: "summary.invitationSent", params: { email } };
      return { key: "summary.invitationUpdated", params: { email } };
    }
    case "Policy": {
      const title = diff.after?.title ?? diff.before?.title ?? "";
      if (!diff.before) return { key: "summary.policyCreated", params: { title } };
      if (!diff.after) return { key: "summary.policyRemoved", params: { title } };
      return { key: "summary.policyUpdated", params: { title } };
    }
    default:
      return { key: "" };
  }
}

/**
 * Format a timestamp as a relative time string.
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Group a date into "today", "yesterday", or a formatted date string.
 */
/**
 * Get the date group key for a timestamp.
 * Returns "today", "yesterday", or a formatted date string.
 */
export function getDateGroup(
  timestamp: number,
  todayLabel: string,
  yesterdayLabel: string
): string {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return todayLabel;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return yesterdayLabel;

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Color for the entity type dot indicator.
 */
export function getTargetTypeColor(
  targetType: Decision["targetType"]
): { light: string; dark: string } {
  switch (targetType) {
    case "teams":
      return { light: "rgb(34 197 94)", dark: "rgb(74 222 128)" }; // green-500 / green-400
    case "roles":
      return { light: "rgb(168 85 247)", dark: "rgb(192 132 252)" }; // purple-500 / purple-400
    case "members":
      return { light: "rgb(59 130 246)", dark: "rgb(96 165 250)" }; // blue-500 / blue-400
    case "orgas":
      return { light: "var(--org-highlight-hover, #d4af37)", dark: "var(--org-highlight-color, #eac840)" };
    case "invitations":
      return { light: "#a2dbed", dark: "#a2dbed" };
    case "policies":
      return { light: "rgb(107 114 128)", dark: "rgb(156 163 175)" }; // gray-500 / gray-400
    default:
      return { light: "rgb(107 114 128)", dark: "rgb(156 163 175)" };
  }
}

/**
 * Extract the changed fields from a diff for display.
 * Returns key-value pairs of changed fields.
 */
export function extractDiffFields(
  diff: Diff
): { field: string; before?: string; after?: string }[] {
  const fields: { field: string; before?: string; after?: string }[] = [];

  const beforeObj = diff.before as Record<string, unknown> | undefined;
  const afterObj = diff.after as Record<string, unknown> | undefined;

  // Collect all field names
  const allKeys = new Set<string>();
  if (beforeObj) Object.keys(beforeObj).forEach((k) => allKeys.add(k));
  if (afterObj) Object.keys(afterObj).forEach((k) => allKeys.add(k));

  // Skip internal ID fields
  const skipFields = new Set(["orgaId", "teamId", "roleId", "emitterMemberId", "parentTeamId"]);

  for (const key of allKeys) {
    if (skipFields.has(key)) continue;

    const beforeVal = beforeObj?.[key];
    const afterVal = afterObj?.[key];

    const beforeStr = formatFieldValue(beforeVal);
    const afterStr = formatFieldValue(afterVal);

    // Only show if there's a meaningful value or change
    if (beforeStr !== afterStr || (!beforeObj && afterStr) || (!afterObj && beforeStr)) {
      fields.push({
        field: key,
        before: beforeStr || undefined,
        after: afterStr || undefined,
      });
    }
  }

  return fields;
}

function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") {
    // Check if it looks like a timestamp (> year 2000 in ms)
    if (value > 946684800000) {
      return new Date(value).toLocaleDateString();
    }
    return String(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value as string | number | boolean);
}
