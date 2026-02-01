"use client";

import { useTranslation } from "react-i18next";
import { useOrgaStore } from "../../tools/orgaStore";
import { EmptyState } from "../EmptyState";
import { OrgNetworkDiagram } from "../OrgNetworkDiagram";

// Spinner component for loading/transition states
const Spinner = ({ text }: { text?: string }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-3">
      <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-gray-400">{text ?? t("loading")}</span>
    </div>
  );
};

export const Authentified = () => {
  const { t } = useTranslation("orgs");
  const { orgasWithCounts, isLoading, hasOrgas, selectedOrga, isSwitchingOrga } = useOrgaStore();

  // Loading state (initial load)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  // Switching organizations - show transition state
  if (isSwitchingOrga) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Spinner text={t("switchingOrganization")} />
      </div>
    );
  }

  // Empty state - no organizations
  if (!hasOrgas) {
    return <EmptyState />;
  }

  // No organization selected yet (multi-org user hasn't chosen)
  if (!selectedOrga) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto p-8">
        <h1 className="font-swarm text-3xl font-bold">{t("selectOrganization")}</h1>
        <p className="text-gray-400">
          {t("selectOrgPrompt")}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgasWithCounts?.map(({ orga, counts }) => (
            <OrgaCard key={orga._id} orga={orga} counts={counts} />
          ))}
        </div>
      </div>
    );
  }

  // Organization selected - show org content (full screen diagram)
  // Use negative margin to break out of parent p-8 padding for edge-to-edge diagram
  // relative positioning creates containing block for the absolute positioned diagram
  return (
    <div className="-m-8 h-[calc(100vh-4rem)] relative">
      <OrgNetworkDiagram orgaId={selectedOrga._id} />
    </div>
  );
};

// Organization card component for selection view
type OrgaCardProps = {
  orga: {
    _id: string;
    name: string;
    logoUrl?: string;
  };
  counts: {
    members: number;
    teams: number;
    roles: number;
  };
};

const OrgaCard = ({ orga, counts }: OrgaCardProps) => {
  const { t } = useTranslation("orgs");
  const { selectOrga } = useOrgaStore();

  return (
    <button
      onClick={() => selectOrga(orga._id as any)}
      className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-6
        bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow
        text-left w-full"
    >
      <div className="flex items-center gap-4 mb-4">
        {orga.logoUrl && (
          <img
            src={orga.logoUrl}
            alt={`${orga.name} logo`}
            className="w-12 h-12 object-contain rounded"
          />
        )}
        <h2 className="text-xl font-bold">{orga.name}</h2>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {counts.members}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t("metrics.members")}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {counts.teams}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t("metrics.teams")}</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {counts.roles}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t("metrics.roles")}</div>
        </div>
      </div>
    </button>
  );
};
