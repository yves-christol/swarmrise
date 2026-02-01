"use client";

import { useOrgaStore } from "../../tools/orgaStore";
import { EmptyState } from "../EmptyState";

export const Authentified = () => {
  const { orgasWithCounts, isLoading, hasOrgas, selectedOrga } = useOrgaStore();

  // Loading state
  if (isLoading) {
    return (
      <div className="mx-auto">
        <p>Loading...</p>
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
        <h1 className="font-swarm text-3xl font-bold">Select an organization</h1>
        <p className="text-gray-400">
          Use the dropdown in the header to choose which organization you want
          to work with.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orgasWithCounts?.map(({ orga, counts }) => (
            <OrgaCard key={orga._id} orga={orga} counts={counts} />
          ))}
        </div>
      </div>
    );
  }

  // Organization selected - show org content
  const selectedOrgaData = orgasWithCounts?.find(
    (o) => o.orga._id === selectedOrga._id
  );

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto p-8">
      <h1 className="font-swarm text-3xl font-bold">{selectedOrga.name}</h1>

      {selectedOrgaData && (
        <div className="grid grid-cols-3 gap-6">
          <MetricCard
            value={selectedOrgaData.counts.members}
            label="Members"
            color="blue"
          />
          <MetricCard
            value={selectedOrgaData.counts.teams}
            label="Teams"
            color="green"
          />
          <MetricCard
            value={selectedOrgaData.counts.roles}
            label="Roles"
            color="purple"
          />
        </div>
      )}

      {/* Placeholder for future content */}
      <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
        <p className="text-gray-400">
          Organization dashboard content will appear here
        </p>
      </div>
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
          <div className="text-xs text-gray-600 dark:text-gray-400">Members</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {counts.teams}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Teams</div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {counts.roles}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Roles</div>
        </div>
      </div>
    </button>
  );
};

// Metric card component
type MetricCardProps = {
  value: number;
  label: string;
  color: "blue" | "green" | "purple";
};

const MetricCard = ({ value, label, color }: MetricCardProps) => {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    purple: "text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="flex flex-col items-center p-6 bg-gray-800 rounded-lg">
      <div className={`text-4xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-gray-400 mt-1">{label}</div>
    </div>
  );
};
