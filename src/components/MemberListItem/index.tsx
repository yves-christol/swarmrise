import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Id } from "../../../convex/_generated/dataModel";
import { ContactInfo, getContactIcon, getContactLink } from "../../utils/contacts";

export type MemberListItemMember = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  email: string;
  pictureURL?: string;
  contactInfos: ContactInfo[];
};

export type MemberListItemProps = {
  member: MemberListItemMember;
  isCurrentUser?: boolean;
  onNavigate?: () => void;
};

type PopoverPosition = {
  top: number;
  right: number;
  direction: "below" | "above";
};

export function MemberListItem({
  member,
  isCurrentUser = false,
  onNavigate,
}: MemberListItemProps) {
  const { t: tMembers } = useTranslation("members");
  const [showContacts, setShowContacts] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<PopoverPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate popover position when it opens
  useEffect(() => {
    if (showContacts && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const estimatedPopoverHeight = 120; // Approximate height of popover

      // Calculate right position (distance from right edge of viewport)
      const rightOffset = viewportWidth - buttonRect.right;

      // If not enough space below, position above
      if (spaceBelow < estimatedPopoverHeight && buttonRect.top > estimatedPopoverHeight) {
        setPopoverPosition({
          top: buttonRect.top - 4, // Position above button with small gap
          right: rightOffset,
          direction: "above",
        });
      } else {
        setPopoverPosition({
          top: buttonRect.bottom + 4, // Position below button with small gap
          right: rightOffset,
          direction: "below",
        });
      }
    } else {
      setPopoverPosition(null);
    }
  }, [showContacts]);

  // Filter out email from contactInfos since it's already displayed
  const additionalContacts = member.contactInfos.filter((c) => c.type !== "Email");
  const hasAdditionalContacts = additionalContacts.length > 0;

  const content = (
    <>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-tertiary flex-shrink-0">
        {member.pictureURL ? (
          <img
            src={member.pictureURL}
            alt={`${member.firstname} ${member.surname}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary font-medium">
            {member.firstname.charAt(0)}
            {member.surname.charAt(0)}
          </div>
        )}
      </div>

      {/* Name and email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-dark dark:text-light truncate">
            {member.firstname} {member.surname}
          </span>
          {isCurrentUser && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-highlight/20 text-highlight-hover dark:text-highlight">
              {tMembers("you")}
            </span>
          )}
        </div>
        <span className="text-sm text-text-secondary truncate block">
          {member.email}
        </span>
      </div>

      {/* Contact info button - only if has additional contacts */}
      {hasAdditionalContacts && (
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              setShowContacts(!showContacts);
            }}
            onBlur={() => setTimeout(() => setShowContacts(false), 150)}
            className="
              p-1.5 rounded-full
              hover:bg-surface-hover-strong
              transition-colors duration-75
              focus:outline-none focus:ring-2 focus:ring-[#a2dbed]
            "
            aria-label={tMembers("viewContactInfo")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-text-secondary"
            >
              <rect x="1" y="3" width="14" height="10" rx="2" />
              <path d="M1 5l7 4 7-4" />
            </svg>
          </button>

          {/* Contact popover - rendered via portal to escape overflow:hidden containers */}
          {showContacts && popoverPosition && createPortal(
            <div
              style={{
                position: "fixed",
                top: popoverPosition.direction === "below" ? popoverPosition.top : undefined,
                bottom: popoverPosition.direction === "above" ? `calc(100vh - ${popoverPosition.top}px)` : undefined,
                right: popoverPosition.right,
              }}
              className="
                z-50
                bg-surface-primary
                border border-border-default
                rounded-lg shadow-lg
                p-3 min-w-48
              "
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                {additionalContacts.map((contact, index) => {
                  const link = getContactLink(contact.type, contact.value);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      {getContactIcon(contact.type)}
                      {link ? (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-dark dark:text-light hover:text-highlight-hover dark:hover:text-highlight transition-colors truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {contact.value}
                        </a>
                      ) : (
                        <span className="text-sm text-dark dark:text-light truncate">
                          {contact.value}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* Navigation chevron - only if navigable */}
      {onNavigate && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="
            text-text-tertiary
            opacity-0 group-hover:opacity-100
            transition-opacity duration-75
            flex-shrink-0
          "
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      )}
    </>
  );

  // If navigable, wrap in a div with button role to avoid nested <button> (contact info button)
  if (onNavigate) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onNavigate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onNavigate();
          }
        }}
        className="
          group
          w-full flex items-center gap-3 px-4 py-3
          hover:bg-surface-hover-subtle
          transition-colors duration-75
          focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
          text-left cursor-pointer
        "
      >
        {content}
      </div>
    );
  }

  // Non-navigable: render as a div with hover state
  return (
    <div
      className="
        group
        w-full flex items-center gap-3 px-4 py-3
        hover:bg-surface-hover-subtle
        transition-colors duration-75
      "
    >
      {content}
    </div>
  );
}
