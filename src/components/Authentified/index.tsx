"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export const Authentified = () => {
  const orgasWithCounts = useQuery(api.orgas.functions.listMyOrgasWithCounts);

  if (orgasWithCounts === undefined) {
    return (
      <div className="mx-auto">
        <p>Loading...</p>
      </div>
    );
  }

  if (orgasWithCounts.length === 0) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold">Welcome!</h1>
        <p>You are not a member of any organizations yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold">Welcome!</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orgasWithCounts.map(({ orga, counts }) => (
          <div
            key={orga._id}
            className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-800 shadow-lg hover:shadow-xl transition-shadow"
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
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {counts.members}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Members
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {counts.teams}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Teams
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {counts.roles}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Roles
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

