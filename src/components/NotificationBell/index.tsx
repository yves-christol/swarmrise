import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { NotificationPanel } from "../NotificationPanel";

const BellIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

export const NotificationBell = () => {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Query unread count - only when signed in
  const unreadCount = useQuery(
    api.notifications.functions.getUnreadCount,
    isSignedIn ? {} : "skip"
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      buttonRef.current?.focus();
    }
  };

  // Close panel and return focus to bell
  const handleClose = useCallback(() => {
    setIsOpen(false);
    buttonRef.current?.focus();
  }, []);

  if (!isSignedIn) {
    return null;
  }

  const count = unreadCount ?? 0;
  const displayCount = count > 9 ? "9+" : count.toString();
  const ariaLabel =
    count === 0
      ? t("notifications:noNotifications", "No notifications")
      : t("notifications:countNotifications", "{{count}} notifications", {
          count,
        });

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="relative p-2 rounded-md hover:bg-surface-hover-strong transition-colors focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <BellIcon className="w-5 h-5 text-text-description" />
        {count > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-xs font-bold bg-highlight text-dark rounded-full px-1.5 ring-2 ring-white dark:ring-dark"
            aria-hidden="true"
          >
            {displayCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationPanel onClose={handleClose} onKeyDown={handleKeyDown} />
      )}
    </div>
  );
};
