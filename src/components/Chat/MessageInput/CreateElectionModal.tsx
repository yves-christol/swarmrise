import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type CreateElectionModalProps = {
  channelId: Id<"channels">;
  orgaId: Id<"orgas">;
  onClose: () => void;
};

export const CreateElectionModal = ({ channelId, orgaId, onClose }: CreateElectionModalProps) => {
  const { t } = useTranslation("chat");
  const [roleTitle, setRoleTitle] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<Id<"roles"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teams and roles for the orga
  const channels = useQuery(api.chat.functions.getChannelsForMember, { orgaId });

  // Get team channels to populate team list
  const teamChannels = channels?.filter((c) => c.kind === "team") ?? [];

  const createElectionMessage = useMutation(api.chat.functions.createElectionMessage);

  const canSubmit = roleTitle.trim() && selectedTeamId && !isSubmitting;

  const handleSubmit = useCallback(() => {
    if (!canSubmit || !selectedTeamId) return;
    setIsSubmitting(true);

    void createElectionMessage({
      channelId,
      roleTitle: roleTitle.trim(),
      teamId: selectedTeamId,
      roleId: selectedRoleId ?? undefined,
    })
      .then(() => onClose())
      .catch((error) => {
        console.error("Failed to create election:", error);
        setIsSubmitting(false);
      });
  }, [canSubmit, roleTitle, selectedTeamId, selectedRoleId, channelId, createElectionMessage, onClose]);

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-light dark:bg-dark rounded-lg shadow-xl w-[90vw] max-w-md border border-slate-200 dark:border-slate-700 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <h3 className="text-sm font-semibold text-dark dark:text-light">
            {t("electionCreate")}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-gray-500 dark:text-gray-400"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3 overflow-y-auto min-h-0 flex-1">
          {/* Role title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("electionRoleTitle")}
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder={t("electionRoleTitlePlaceholder")}
              autoFocus
              className="w-full text-sm bg-slate-100 dark:bg-slate-800 text-dark dark:text-light rounded-md px-3 py-2 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            />
          </div>

          {/* Team selection */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t("electionTeam")}
            </label>
            <select
              value={selectedTeamId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTeamId(val ? val as Id<"teams"> : null);
                setSelectedRoleId(null);
              }}
              className="w-full text-sm bg-slate-100 dark:bg-slate-800 text-dark dark:text-light rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            >
              <option value="">{t("electionSelectTeam")}</option>
              {teamChannels.map((tc) => (
                <option key={tc._id} value={tc.teamId as string}>
                  {tc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 dark:border-slate-700 shrink-0">
          <button
            onClick={onClose}
            className="text-sm px-3 py-1.5 rounded-md bg-slate-200 dark:bg-slate-700 text-dark dark:text-light hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            {t("electionCancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="text-sm px-3 py-1.5 rounded-md bg-highlight text-dark font-medium hover:bg-highlight-hover disabled:opacity-40 transition-colors"
          >
            {t("electionSubmit")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};
