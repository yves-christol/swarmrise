"use client";

import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Logo } from "../Logo";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { CreateOrganizationModal } from "../CreateOrganizationModal";

// Inline SVG icons
const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
  </svg>
);

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

const OrgPlaceholderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);

type InvitationWithOrga = {
  invitation: {
    _id: Id<"invitations">;
    orgaId: Id<"orgas">;
    email: string;
    status: "pending" | "accepted" | "rejected";
  };
  orga: {
    _id: Id<"orgas">;
    name: string;
    logoUrl?: string;
  };
  emitterName: string;
};

const InvitationCard = ({ data }: { data: InvitationWithOrga }) => {
  const { t } = useTranslation("invitations");
  const [isProcessing, setIsProcessing] = useState(false);
  const acceptInvitation = useMutation(api.users.functions.acceptInvitation);
  const rejectInvitation = useMutation(api.users.functions.rejectInvitation);

  const handleAccept = () => {
    setIsProcessing(true);
    acceptInvitation({ invitationId: data.invitation._id })
      .catch((error) => {
        console.error("Failed to accept invitation:", error);
        setIsProcessing(false);
      });
  };

  const handleReject = () => {
    setIsProcessing(true);
    rejectInvitation({ invitationId: data.invitation._id })
      .catch((error) => {
        console.error("Failed to reject invitation:", error);
        setIsProcessing(false);
      });
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-dark dark:text-light truncate">{data.orga.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {t("invitedBy", { name: data.emitterName })}
          </p>
        </div>
        {data.orga.logoUrl ? (
          <img
            src={data.orga.logoUrl}
            alt=""
            className="w-10 h-10 rounded object-contain ml-3 flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center ml-3 flex-shrink-0">
            <OrgPlaceholderIcon className="w-6 h-6 text-gray-500" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5
            bg-[#eac840] hover:bg-[#d4af37] disabled:opacity-50
            text-dark font-medium rounded transition-colors"
        >
          <CheckIcon className="w-4 h-4" />
          {t("accept")}
        </button>
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className="flex items-center justify-center gap-1.5 px-3 py-1.5
            border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50
            text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
        >
          <XIcon className="w-4 h-4" />
          {t("decline")}
        </button>
      </div>
    </div>
  );
};

export const EmptyState = () => {
  const { t } = useTranslation("orgs");
  const { t: tCommon } = useTranslation("common");
  const { t: tInvitations } = useTranslation("invitations");
  const pendingInvitations = useQuery(
    api.users.functions.listMyPendingInvitationsWithOrga
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isLoading = pendingInvitations === undefined;
  const hasInvitations = !isLoading && pendingInvitations.length > 0;

  return (
    <div className="flex flex-col items-center gap-8 max-w-md mx-auto py-8">
      <Logo size={64} begin={0} repeatCount={2} />

      <div className="text-center">
        <h1 className="font-swarm text-3xl mb-2">{t("welcome")}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t("noBelongYet")}
        </p>
      </div>

      {isLoading && (
        <div className="w-full">
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
          </div>
        </div>
      )}

      {hasInvitations && (
        <div className="w-full">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-4">
            {tInvitations("pendingInvitations")}
          </h2>
          <div className="flex flex-col gap-3">
            {pendingInvitations.map((data) => (
              <InvitationCard key={data.invitation._id} data={data} />
            ))}
          </div>
        </div>
      )}

      {hasInvitations && (
        <div className="flex items-center gap-4 w-full">
          <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
          <span className="text-gray-500 text-sm">{tCommon("or")}</span>
          <div className="flex-1 border-t border-gray-200 dark:border-gray-700" />
        </div>
      )}

      <button
        onClick={() => setIsCreateModalOpen(true)}
        type="button"
        className="px-6 py-3 bg-[#eac840] hover:bg-[#d4af37]
          text-dark font-bold rounded-lg transition-colors"
      >
        {hasInvitations
          ? t("createNewOrganization")
          : t("createFirstOrganization")}
      </button>

      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
