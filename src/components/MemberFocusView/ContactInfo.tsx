import type { MemberData } from "./types";

type ContactInfoProps = {
  member: MemberData;
};

export function ContactInfo({ member }: ContactInfoProps) {
  return (
    <div
      className="absolute bottom-4 left-4 z-10 max-w-xs"
      style={{
        animation: "contactFadeIn 300ms ease-out 400ms both",
      }}
    >
      {/* Email badge - always visible */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-gray-500 dark:text-gray-400"
        >
          <rect x="1" y="3" width="14" height="10" rx="2" />
          <path d="M1 5l7 4 7-4" />
        </svg>
        <a
          href={`mailto:${member.email}`}
          className="text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {member.email}
        </a>
      </div>

      {/* Toggle button for expanded info - placeholder for future contact fields */}
      {/* Currently member only has email, but this can be extended */}
    </div>
  );
}
