import { useTranslation } from "react-i18next";

type ResolvedPhaseProps = {
  outcome?: "accepted" | "modified" | "withdrawn";
};

const outcomeStyles: Record<string, string> = {
  accepted: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  modified: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  withdrawn: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export const ResolvedPhase = ({ outcome }: ResolvedPhaseProps) => {
  const { t } = useTranslation("chat");

  const outcomeKey = outcome === "accepted"
    ? "topicOutcomeAccepted"
    : outcome === "modified"
      ? "topicOutcomeModified"
      : "topicOutcomeWithdrawn";

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2 space-y-2">
      {outcome && (
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${outcomeStyles[outcome] ?? outcomeStyles.withdrawn}`}>
            {t(outcomeKey)}
          </span>
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        {t("topicDecisionRecorded")}
      </p>
    </div>
  );
};
