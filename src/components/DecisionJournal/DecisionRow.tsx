import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type Decision,
  getDecisionSummaryKey,
  formatRelativeTime,
  getTargetTypeColor,
  extractDiffFields,
} from "./formatters";

type DecisionRowProps = {
  decision: Decision;
  showTeamName: boolean;
};

export function DecisionRow({ decision, showTeamName }: DecisionRowProps) {
  const { t: tDecisions } = useTranslation("decisions");
  // Cast to allow dynamic keys from getDecisionSummaryKey
  const t = tDecisions as (key: string, options?: Record<string, string>) => string;
  const [isExpanded, setIsExpanded] = useState(false);

  const { key: summaryKey, params: summaryParams } = getDecisionSummaryKey(decision);
  const summary = t(summaryKey, summaryParams);
  const relativeTime = formatRelativeTime(decision._creationTime);
  const color = getTargetTypeColor(decision.targetType);

  return (
    <button
      onClick={() => setIsExpanded(!isExpanded)}
      className="
        w-full text-left
        px-4 py-3
        hover:bg-surface-hover-subtle
        transition-colors duration-75
        focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
      "
      aria-expanded={isExpanded}
    >
      <div className="flex items-start gap-3">
        {/* Entity type dot */}
        <div className="mt-1.5 flex-shrink-0">
          <span
            className="w-2 h-2 rounded-full inline-block dark:hidden"
            style={{ backgroundColor: color.light }}
            aria-hidden="true"
          />
          <span
            className="w-2 h-2 rounded-full hidden dark:inline-block"
            style={{ backgroundColor: color.dark }}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-dark dark:text-light">
            {summary}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {decision.authorEmail}
            <span className="mx-1 text-gray-300 dark:text-gray-600">&mdash;</span>
            {decision.roleName}
            {showTeamName && (
              <>
                {" "}in {decision.teamName}
              </>
            )}
          </p>
        </div>

        {/* Timestamp + expand indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-text-tertiary whitespace-nowrap">
            {relativeTime}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`
              text-text-tertiary
              transition-transform duration-150
              ${isExpanded ? "rotate-180" : ""}
            `}
          >
            <path d="M3 5l3 3 3-3" />
          </svg>
        </div>
      </div>

      {/* Expanded diff panel */}
      {isExpanded && <DiffPanel decision={decision} />}
    </button>
  );
}

function DiffPanel({ decision }: { decision: Decision }) {
  const { t: tDecisions } = useTranslation("decisions");
  const t = tDecisions as (key: string) => string;
  const fields = extractDiffFields(decision.diff);
  const isCreation = !decision.diff.before;
  const isDeletion = !decision.diff.after;

  if (fields.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-3 px-3 py-2 bg-surface-secondary/50 rounded-md text-xs"
      role="region"
      onClick={(e) => e.stopPropagation()}
    >
      {isCreation || isDeletion ? (
        <div>
          <span className="font-medium text-text-secondary uppercase tracking-wide text-[11px]">
            {isCreation ? t("created") : t("removed")}
          </span>
          <div className="mt-1 space-y-1">
            {fields.map((f) => (
              <div key={f.field} className="flex gap-2">
                <span className="text-text-tertiary min-w-20">
                  {f.field}
                </span>
                <span className={isCreation
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500/60"
                }>
                  {f.after || f.before}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-text-secondary uppercase tracking-wide text-[11px]">
              {t("diffBefore")}
            </span>
            <div className="mt-1 space-y-1">
              {fields.map((f) => (
                <div key={f.field} className="flex gap-2">
                  <span className="text-text-tertiary min-w-16">
                    {f.field}
                  </span>
                  <span className="text-red-500/60">
                    {f.before || "\u2014"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <span className="font-medium text-text-secondary uppercase tracking-wide text-[11px]">
              {t("diffAfter")}
            </span>
            <div className="mt-1 space-y-1">
              {fields.map((f) => (
                <div key={f.field} className="flex gap-2">
                  <span className="text-text-tertiary min-w-16">
                    {f.field}
                  </span>
                  <span className="text-green-600 dark:text-green-400">
                    {f.after || "\u2014"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
