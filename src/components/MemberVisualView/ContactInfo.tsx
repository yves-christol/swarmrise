import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { MemberData } from "./types";

type ContactInfoProps = {
  member: MemberData;
  onClose: () => void;
};

function getContactIcon(type: string) {
  switch (type) {
    case "LinkedIn":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#0A66C2]">
          <path d="M13.6 1H2.4C1.6 1 1 1.6 1 2.4v11.2c0 .8.6 1.4 1.4 1.4h11.2c.8 0 1.4-.6 1.4-1.4V2.4c0-.8-.6-1.4-1.4-1.4zM5.2 13H3V6.2h2.2V13zM4.1 5.2c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3 1.3.6 1.3 1.3-.6 1.3-1.3 1.3zM13 13h-2.2V9.7c0-.8 0-1.8-1.1-1.8-1.1 0-1.3.9-1.3 1.8V13H6.2V6.2h2.1v.9h.1c.3-.6 1-1.2 2.1-1.2 2.2 0 2.6 1.5 2.6 3.4V13z"/>
        </svg>
      );
    case "Email":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <rect x="1" y="3" width="14" height="10" rx="2" />
          <path d="M1 5l7 4 7-4" />
        </svg>
      );
    case "Facebook":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#1877F2]">
          <path d="M15 8a7 7 0 10-8.1 6.9v-4.9H5.1V8h1.8V6.4c0-1.8 1-2.7 2.6-2.7.8 0 1.6.1 1.6.1v1.7h-.9c-.9 0-1.2.6-1.2 1.1V8h2l-.3 2h-1.7v4.9A7 7 0 0015 8z"/>
        </svg>
      );
    case "Instagram":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#E4405F]">
          <path d="M8 1.4c2.1 0 2.4 0 3.2.1.8 0 1.2.2 1.5.3.4.1.6.3.9.6.3.3.4.5.6.9.1.3.2.7.3 1.5 0 .8.1 1.1.1 3.2s0 2.4-.1 3.2c0 .8-.2 1.2-.3 1.5-.1.4-.3.6-.6.9-.3.3-.5.4-.9.6-.3.1-.7.2-1.5.3-.8 0-1.1.1-3.2.1s-2.4 0-3.2-.1c-.8 0-1.2-.2-1.5-.3-.4-.1-.6-.3-.9-.6-.3-.3-.4-.5-.6-.9-.1-.3-.2-.7-.3-1.5 0-.8-.1-1.1-.1-3.2s0-2.4.1-3.2c0-.8.2-1.2.3-1.5.1-.4.3-.6.6-.9.3-.3.5-.4.9-.6.3-.1.7-.2 1.5-.3.8 0 1.1-.1 3.2-.1M8 0C5.8 0 5.5 0 4.7.1c-.8 0-1.4.2-1.9.4-.5.2-1 .5-1.4.9-.4.4-.7.9-.9 1.4-.2.5-.3 1.1-.4 1.9C0 5.5 0 5.8 0 8s0 2.5.1 3.3c0 .8.2 1.4.4 1.9.2.5.5 1 .9 1.4.4.4.9.7 1.4.9.5.2 1.1.3 1.9.4.8 0 1.1.1 3.3.1s2.5 0 3.3-.1c.8 0 1.4-.2 1.9-.4.5-.2 1-.5 1.4-.9.4-.4.7-.9.9-1.4.2-.5.3-1.1.4-1.9 0-.8.1-1.1.1-3.3s0-2.5-.1-3.3c0-.8-.2-1.4-.4-1.9-.2-.5-.5-1-.9-1.4-.4-.4-.9-.7-1.4-.9-.5-.2-1.1-.3-1.9-.4C10.5 0 10.2 0 8 0zm0 3.9a4.1 4.1 0 100 8.2 4.1 4.1 0 000-8.2zm0 6.8a2.7 2.7 0 110-5.4 2.7 2.7 0 010 5.4zm5.2-7a1 1 0 11-2 0 1 1 0 012 0z"/>
        </svg>
      );
    case "Whatsapp":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[#25D366]">
          <path d="M13.6 2.3A7.5 7.5 0 001 11.4L0 16l4.7-1.2a7.5 7.5 0 003.6.9A7.5 7.5 0 0016 8.2a7.5 7.5 0 00-2.4-5.9zM8.3 14a6.2 6.2 0 01-3.2-.9l-.2-.1-2.4.6.7-2.4-.2-.2a6.2 6.2 0 119.5-5.3 6.2 6.2 0 01-4.2 8.3zm3.4-4.6c-.2-.1-1.1-.6-1.3-.6-.2-.1-.3-.1-.4.1-.1.2-.5.6-.6.8-.1.1-.2.1-.4 0-.2-.1-.8-.3-1.5-.9-.6-.5-1-1.2-1.1-1.4-.1-.2 0-.3.1-.4l.3-.3c.1-.1.1-.2.2-.3 0-.1 0-.2 0-.3l-.6-1.4c-.2-.4-.3-.3-.5-.4h-.4c-.1 0-.4 0-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.5.5.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.2-.1-.4-.2z"/>
        </svg>
      );
    case "Mobile":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <rect x="4" y="1" width="8" height="14" rx="2" />
          <line x1="7" y1="12" x2="9" y2="12" />
        </svg>
      );
    case "Website":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <circle cx="8" cy="8" r="6" />
          <ellipse cx="8" cy="8" rx="2.5" ry="6" />
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      );
    case "Twitter":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-800 dark:text-gray-200">
          <path d="M9.5 6.8L14.2 1H13L9 5.8 5.7 1H1l5 7.3L1 15h1.3l4.4-5.1 3.5 5.1H15L9.5 6.8zm-1.5 1.8l-.5-.7L3.2 2h1.8l3.3 4.7.5.7 4.2 6H11L8 8.6z"/>
        </svg>
      );
    case "Address":
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <path d="M8 1C5.2 1 3 3.2 3 6c0 4 5 9 5 9s5-5 5-9c0-2.8-2.2-5-5-5z" />
          <circle cx="8" cy="6" r="2" />
        </svg>
      );
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500 dark:text-gray-400">
          <circle cx="8" cy="8" r="6" />
        </svg>
      );
  }
}

function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

function getContactLink(type: string, value: string): string | null {
  let url: string;
  switch (type) {
    case "LinkedIn":
      url = value.startsWith("http") ? value : `https://linkedin.com/in/${value}`;
      break;
    case "Email":
      url = `mailto:${value}`;
      break;
    case "Facebook":
      url = value.startsWith("http") ? value : `https://facebook.com/${value}`;
      break;
    case "Instagram":
      url = value.startsWith("http") ? value : `https://instagram.com/${value}`;
      break;
    case "Whatsapp":
      url = `https://wa.me/${value.replace(/\D/g, "")}`;
      break;
    case "Mobile":
      url = `tel:${value}`;
      break;
    case "Website":
      url = value.startsWith("http") ? value : `https://${value}`;
      break;
    case "Twitter":
      url = value.startsWith("http") ? value : `https://x.com/${value.replace(/^@/, "")}`;
      break;
    default:
      return null;
  }
  return sanitizeUrl(url);
}

export function ContactInfo({ member, onClose }: ContactInfoProps) {
  const { t } = useTranslation("members");

  // Combine the primary email with any additional contact infos
  const allContacts = [
    { type: "Email" as const, value: member.email },
    ...member.contactInfos.filter((c) => !(c.type === "Email" && c.value === member.email)),
  ];

  const hasContacts = allContacts.length > 0;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ animation: "contactModalFadeIn 200ms ease-out" }}
    >
      <style>{`
        @keyframes contactModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes contactModalSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/60"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-sm mx-6"
        style={{ maxHeight: "70vh", overflowY: "auto", animation: "contactModalSlideIn 250ms ease-out" }}
      >
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3">
            {/* Member avatar in header */}
            {member.pictureURL ? (
              <img
                src={member.pictureURL}
                alt={`${member.firstname} ${member.surname}`}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#a2dbed]"
              />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 dark:bg-gray-700 border-2 border-[#a2dbed]">
                <span className="font-title text-xs font-semibold text-dark dark:text-light">
                  {member.firstname[0] || ""}{member.surname[0] || ""}
                </span>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-dark dark:text-light leading-tight">
                {member.firstname} {member.surname}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("contactInformation")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border-none bg-transparent text-gray-500 dark:text-gray-400"
            title={t("diagram.closeContactModal")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Contact list */}
        {hasContacts ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {allContacts.map((contact, index) => {
              const link = getContactLink(contact.type, contact.value);
              return (
                <div key={`${contact.type}-${index}`} className="flex items-center gap-3 px-5 py-3">
                  <span className="shrink-0">{getContactIcon(contact.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
                      {contact.type}
                    </p>
                    {link ? (
                      <a
                        href={link}
                        target={contact.type !== "Email" && contact.type !== "Mobile" ? "_blank" : undefined}
                        rel={contact.type !== "Email" && contact.type !== "Mobile" ? "noopener noreferrer" : undefined}
                        className="text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors truncate block"
                      >
                        {contact.value}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-700 dark:text-gray-200 truncate block">
                        {contact.value}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("noContactInfo")}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
