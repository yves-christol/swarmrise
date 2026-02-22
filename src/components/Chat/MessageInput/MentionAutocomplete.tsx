import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Id } from "../../../../convex/_generated/dataModel";

export type MemberOption = {
  _id: Id<"members">;
  firstname: string;
  surname: string;
  pictureURL?: string;
};

type MentionAutocompleteProps = {
  members: MemberOption[];
  filter: string;
  position: { bottom: number; left: number };
  onSelect: (member: MemberOption) => void;
  onClose: () => void;
};

/**
 * Autocomplete dropdown for @mentions.
 * Shows filtered members and allows keyboard/mouse selection.
 * Positioned absolutely relative to the viewport (portaled or positioned by parent).
 */
export const MentionAutocomplete = ({
  members,
  filter,
  position,
  onSelect,
  onClose,
}: MentionAutocompleteProps) => {
  const { t } = useTranslation("chat");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const normalizedFilter = filter.toLowerCase();
  const filtered = members.filter((m) => {
    const fullName = `${m.firstname} ${m.surname}`.toLowerCase();
    return fullName.includes(normalizedFilter);
  });

  // Cap the visible results
  const maxResults = 8;
  const visible = filtered.slice(0, maxResults);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (visible.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % visible.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + visible.length) % visible.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        onSelect(visible[selectedIndex]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [visible, selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    // Use capture phase so we intercept before the textarea's own handlers
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [handleKeyDown]);

  if (visible.length === 0) {
    return (
      <div
        data-mention-autocomplete
        className="fixed z-[9999] bg-surface-primary border border-border-default rounded-lg shadow-lg py-2 px-3 min-w-[200px]"
        style={{ bottom: position.bottom, left: position.left }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <span className="text-xs text-text-tertiary">
          {t("mentionNoResults")}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      data-mention-autocomplete
      className="fixed z-[9999] bg-surface-primary border border-border-default rounded-lg shadow-lg py-1 min-w-[220px] max-h-[240px] overflow-y-auto"
      style={{ bottom: position.bottom, left: position.left }}
      role="listbox"
      aria-label={t("mentionMembers")}
      onMouseDown={(e) => e.preventDefault()}
    >
      {visible.map((member, idx) => {
        const initials = `${member.firstname[0] ?? ""}${member.surname[0] ?? ""}`.toUpperCase();
        return (
          <button
            key={member._id}
            role="option"
            aria-selected={idx === selectedIndex}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
              idx === selectedIndex
                ? "bg-highlight/15 text-dark dark:text-light"
                : "text-dark dark:text-light hover:bg-surface-hover"
            }`}
            onClick={() => onSelect(member)}
            onMouseEnter={() => setSelectedIndex(idx)}
          >
            <div className="w-6 h-6 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
              {member.pictureURL ? (
                <img
                  src={member.pictureURL}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] font-medium text-text-description">
                  {initials}
                </span>
              )}
            </div>
            <span className="truncate">
              {member.firstname} {member.surname}
            </span>
          </button>
        );
      })}
    </div>
  );
};
