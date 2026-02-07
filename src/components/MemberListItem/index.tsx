"use client";

import { useState } from "react";
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

export function MemberListItem({
  member,
  isCurrentUser = false,
  onNavigate,
}: MemberListItemProps) {
  const { t: tMembers } = useTranslation("members");
  const [showContacts, setShowContacts] = useState(false);

  // Filter out email from contactInfos since it's already displayed
  const additionalContacts = member.contactInfos.filter((c) => c.type !== "Email");
  const hasAdditionalContacts = additionalContacts.length > 0;

  const content = (
    <>
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        {member.pictureURL ? (
          <img
            src={member.pictureURL}
            alt={`${member.firstname} ${member.surname}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 font-medium">
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
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#eac840]/20 text-[#d4af37] dark:text-[#eac840]">
              {tMembers("you")}
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 truncate block">
          {member.email}
        </span>
      </div>

      {/* Contact info button - only if has additional contacts */}
      {hasAdditionalContacts && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowContacts(!showContacts);
            }}
            onBlur={() => setTimeout(() => setShowContacts(false), 150)}
            className="
              p-1.5 rounded-full
              hover:bg-gray-200 dark:hover:bg-gray-600
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
              className="text-gray-500 dark:text-gray-400"
            >
              <rect x="1" y="3" width="14" height="10" rx="2" />
              <path d="M1 5l7 4 7-4" />
            </svg>
          </button>

          {/* Contact popover */}
          {showContacts && (
            <div
              className="
                absolute right-0 top-full mt-1 z-20
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
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
                          className="text-sm text-dark dark:text-light hover:text-[#d4af37] dark:hover:text-[#eac840] transition-colors truncate"
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
            </div>
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
            text-gray-400 dark:text-gray-500
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

  // If navigable, wrap in a button
  if (onNavigate) {
    return (
      <button
        onClick={onNavigate}
        className="
          group
          w-full flex items-center gap-3 px-4 py-3
          hover:bg-gray-50 dark:hover:bg-gray-700/50
          transition-colors duration-75
          focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#a2dbed]
          text-left
        "
      >
        {content}
      </button>
    );
  }

  // Non-navigable: render as a div with hover state
  return (
    <div
      className="
        group
        w-full flex items-center gap-3 px-4 py-3
        hover:bg-gray-50 dark:hover:bg-gray-700/50
        transition-colors duration-75
      "
    >
      {content}
    </div>
  );
}
