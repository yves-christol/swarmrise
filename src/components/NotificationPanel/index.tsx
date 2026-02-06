import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { NotificationItem } from "../NotificationItem";
import type { Notification } from "../../../convex/notifications";

type NotificationPanelProps = {
  onClose: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
};

export const NotificationPanel = ({
  onClose,
  onKeyDown,
}: NotificationPanelProps) => {
  const { t } = useTranslation();

  // Query active (non-archived) notifications
  const notifications = useQuery(api.notifications.functions.getActive);
  const markAllAsRead = useMutation(api.notifications.functions.markAllAsRead);

  const isLoading = notifications === undefined;
  const isEmpty = notifications?.length === 0;

  // Sort notifications: unread first, then by creation time (newest first)
  const sortedNotifications = notifications
    ? [...notifications].sort((a, b) => {
        // Unread first
        if (a.isRead !== b.isRead) {
          return a.isRead ? 1 : -1;
        }
        // Then by creation time (newest first)
        return b._creationTime - a._creationTime;
      })
    : [];

  const unreadCount = sortedNotifications.filter((n) => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div
      className="absolute top-full right-0 mt-2 w-80 max-h-[28rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 flex flex-col overflow-hidden"
      role="dialog"
      aria-label={t("notifications:panel", "Notifications")}
      onKeyDown={onKeyDown}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="font-medium text-dark dark:text-light">
          {t("notifications:title", "Notifications")}
        </h2>
        {unreadCount > 0 && (
          <button
            onClick={() => void handleMarkAllAsRead()}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#eac840] dark:hover:text-[#eac840] transition-colors"
          >
            {t("notifications:markAllAsRead", "Mark all as read")}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <div className="animate-pulse flex flex-col gap-3">
              <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
              <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded" />
            </div>
          </div>
        ) : isEmpty ? (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t("notifications:empty", "No notifications")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sortedNotifications.map((notification: Notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onActionComplete={onClose}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
