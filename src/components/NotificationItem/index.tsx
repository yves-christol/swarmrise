import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { useOrgaStore } from "../../tools/orgaStore";
import type { Notification } from "../../../convex/notifications";

// Icons
const MailIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const UserPlusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

const FileTextIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const InfoIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

type NotificationItemProps = {
  notification: Notification;
  onActionComplete?: () => void;
};

// Format relative time
const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString();
};

export const NotificationItem = ({
  notification,
  onActionComplete,
}: NotificationItemProps) => {
  const { t } = useTranslation();
  const { setCurrentOrgaId } = useOrgaStore();

  // Mutations
  const markAsRead = useMutation(api.notifications.functions.markAsRead);
  const archiveNotification = useMutation(api.notifications.functions.archive);
  const acceptInvitation = useMutation(api.users.functions.acceptInvitation);
  const rejectInvitation = useMutation(api.users.functions.rejectInvitation);

  const { payload, isRead, _creationTime } = notification;

  // Mark as read when clicking on the notification
  const handleClick = async () => {
    if (!isRead) {
      await markAsRead({ notificationId: notification._id });
    }
  };

  // Get icon and color based on category
  const getIconAndColor = () => {
    switch (payload.category) {
      case "invitation":
        return {
          icon: <MailIcon className="w-5 h-5" />,
          color: "text-[#eac840]",
        };
      case "role_assignment":
        return {
          icon: <UserPlusIcon className="w-5 h-5" />,
          color: "text-[#a2dbed]",
        };
      case "policy_global":
      case "policy_team":
        return {
          icon: <FileTextIcon className="w-5 h-5" />,
          color: "text-gray-500 dark:text-gray-400",
        };
      default:
        return {
          icon: <InfoIcon className="w-5 h-5" />,
          color: "text-gray-500 dark:text-gray-400",
        };
    }
  };

  const { icon, color } = getIconAndColor();

  // Render invitation-specific content
  const renderInvitationContent = () => {
    if (payload.category !== "invitation") return null;

    const handleAccept = async () => {
      try {
        await acceptInvitation({ invitationId: payload.invitationId });
        // Switch to the new organization
        if ("orgaId" in payload) {
          setCurrentOrgaId(payload.orgaId as string);
        }
        // Archive the notification
        await archiveNotification({ notificationId: notification._id });
        onActionComplete?.();
      } catch (error) {
        console.error("Failed to accept invitation:", error);
      }
    };

    const handleDecline = async () => {
      try {
        await rejectInvitation({ invitationId: payload.invitationId });
        // Archive the notification
        await archiveNotification({ notificationId: notification._id });
        onActionComplete?.();
      } catch (error) {
        console.error("Failed to decline invitation:", error);
      }
    };

    return (
      <>
        <p className={`font-medium text-dark dark:text-light ${!isRead ? "font-semibold" : ""}`}>
          {t("notifications:invitationTitle", "Invitation to {{orgaName}}", {
            orgaName: payload.orgaName,
          })}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {t("notifications:invitedBy", "Invited by {{inviterName}}", {
            inviterName: payload.inviterName,
          })}
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => void handleAccept()}
            className="px-3 py-1.5 text-sm font-medium bg-[#eac840] hover:bg-[#d4af37] text-dark rounded transition-colors"
          >
            {t("notifications:accept", "Accept")}
          </button>
          <button
            onClick={() => void handleDecline()}
            className="px-3 py-1.5 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {t("notifications:decline", "Decline")}
          </button>
        </div>
      </>
    );
  };

  // Render role assignment content
  const renderRoleAssignmentContent = () => {
    if (payload.category !== "role_assignment") return null;

    return (
      <>
        <p className={`font-medium text-dark dark:text-light ${!isRead ? "font-semibold" : ""}`}>
          {t("notifications:roleAssignmentTitle", "New role: {{roleTitle}}", {
            roleTitle: payload.roleTitle,
          })}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {t("notifications:roleAssignmentSubtitle", "In {{teamName}} at {{orgaName}}", {
            teamName: payload.teamName,
            orgaName: payload.orgaName,
          })}
        </p>
      </>
    );
  };

  // Render policy content
  const renderPolicyContent = () => {
    if (payload.category !== "policy_global" && payload.category !== "policy_team")
      return null;

    const subtitle =
      payload.category === "policy_global"
        ? t("notifications:policyGlobalSubtitle", "Organization-wide policy in {{orgaName}}", {
            orgaName: payload.orgaName,
          })
        : t("notifications:policyTeamSubtitle", "Team policy in {{teamName}}", {
            teamName: payload.teamName,
          });

    return (
      <>
        <p className={`font-medium text-dark dark:text-light ${!isRead ? "font-semibold" : ""}`}>
          {t("notifications:policyTitle", "New policy: {{policyTitle}}", {
            policyTitle: payload.policyTitle,
          })}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
      </>
    );
  };

  // Render system notification content
  const renderSystemContent = () => {
    if (payload.category !== "system") return null;

    return (
      <>
        <p className={`font-medium text-dark dark:text-light ${!isRead ? "font-semibold" : ""}`}>
          {payload.title}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{payload.message}</p>
      </>
    );
  };

  // Render default content for other categories
  const renderDefaultContent = () => {
    if (
      payload.category === "invitation" ||
      payload.category === "role_assignment" ||
      payload.category === "policy_global" ||
      payload.category === "policy_team" ||
      payload.category === "system"
    ) {
      return null;
    }

    return (
      <p className={`font-medium text-dark dark:text-light ${!isRead ? "font-semibold" : ""}`}>
        {t("notifications:genericNotification", "New notification")}
      </p>
    );
  };

  return (
    <div
      className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
        !isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
      }`}
      onClick={() => void handleClick()}
      role="article"
      aria-label={t("notifications:notificationItem", "Notification")}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`${color} mt-0.5 flex-shrink-0`}>{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderInvitationContent()}
          {renderRoleAssignmentContent()}
          {renderPolicyContent()}
          {renderSystemContent()}
          {renderDefaultContent()}
        </div>

        {/* Timestamp and unread indicator */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatRelativeTime(_creationTime)}
          </span>
          {!isRead && (
            <span
              className="w-2 h-2 bg-[#eac840] rounded-full"
              aria-label={t("notifications:unread", "Unread")}
            />
          )}
        </div>
      </div>
    </div>
  );
};
