import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Curated set of commonly-used reaction emojis.
 * Kept intentionally small to stay aligned with the "low complexity" principle.
 */
const EMOJI_PALETTE = [
  "\u{1F44D}", // thumbs up
  "\u{1F44E}", // thumbs down
  "\u{2764}\u{FE0F}", // red heart
  "\u{1F604}", // smile with open mouth
  "\u{1F602}", // tears of joy
  "\u{1F914}", // thinking face
  "\u{1F389}", // party popper
  "\u{1F64F}", // folded hands (thank you)
  "\u{1F44F}", // clapping hands
  "\u{1F440}", // eyes
  "\u{2705}",  // check mark
  "\u{274C}",  // cross mark
];

const PICKER_WIDTH = 268; // 6 cols * 40px + padding + gaps

/**
 * Portaled emoji picker that escapes parent overflow constraints.
 * Positions itself above the anchor button, flipping below if there's not enough space.
 */
const EmojiPickerPortal = ({
  anchorRef,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Compute position from anchor button
  useEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const pickerHeight = 80; // approximate height of 2 rows + padding
    const spaceAbove = rect.top;
    const showAbove = spaceAbove > pickerHeight + 4;

    setPosition({
      top: showAbove ? rect.top - pickerHeight - 4 : rect.bottom + 4,
      left: Math.max(4, Math.min(rect.left, window.innerWidth - PICKER_WIDTH - 4)),
    });
  }, [anchorRef]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorRef, onClose]);

  if (!position) return null;

  return createPortal(
    <div
      ref={pickerRef}
      className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-2 grid grid-cols-6 gap-1"
      style={{ top: position.top, left: position.left, minWidth: `${PICKER_WIDTH}px` }}
    >
      {EMOJI_PALETTE.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="w-10 h-10 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-lg transition-colors"
          title={emoji}
        >
          {emoji}
        </button>
      ))}
    </div>,
    document.body
  );
};

type ReactionGroup = {
  emoji: string;
  count: number;
  reacted: boolean;
  memberNames: string[];
};

type ReactionBarProps = {
  messageId: Id<"messages">;
  reactions: ReactionGroup[];
  showAddButton?: boolean;
};

/**
 * Displays existing reaction badges below a message and provides
 * an "add reaction" button with an emoji picker popover.
 */
export const ReactionBar = ({ messageId, reactions, showAddButton = true }: ReactionBarProps) => {
  const { t } = useTranslation("chat");
  const toggleReaction = useMutation(api.chat.functions.toggleReaction);
  const [pickerOpen, setPickerOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = useCallback(
    (emoji: string) => {
      void toggleReaction({ messageId, emoji }).catch((error) => {
        console.error("Failed to toggle reaction:", error);
      });
      setPickerOpen(false);
    },
    [messageId, toggleReaction]
  );

  const closePicker = useCallback(() => setPickerOpen(false), []);

  const buildTooltip = (group: ReactionGroup): string => {
    const MAX_NAMES = 5;
    const names = group.memberNames.slice(0, MAX_NAMES);
    const remainder = group.memberNames.length - MAX_NAMES;

    let text = names.join(", ");
    if (remainder > 0) {
      text += ` ${t("andOthers", { count: remainder })}`;
    }
    return text;
  };

  // Don't render anything if there are no reactions and we shouldn't show the add button
  if (reactions.length === 0 && !showAddButton) return null;

  return (
    <div className="flex items-center flex-wrap gap-1 mt-1">
      {reactions.map((group) => (
        <button
          key={group.emoji}
          onClick={() => handleToggle(group.emoji)}
          title={buildTooltip(group)}
          className={`
            inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs
            border transition-colors
            ${
              group.reacted
                ? "bg-[#eac840]/15 border-[#eac840]/40 text-dark dark:text-light"
                : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-400"
            }
            hover:bg-slate-200 dark:hover:bg-slate-700
          `}
        >
          <span className="text-sm leading-none">{group.emoji}</span>
          <span className="leading-none font-medium">{group.count}</span>
        </button>
      ))}

      {/* Add reaction button -- only show on hover via parent group */}
      {showAddButton && (
        <>
          <button
            ref={buttonRef}
            onClick={() => setPickerOpen(!pickerOpen)}
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
            title={t("addReaction")}
            aria-label={t("addReaction")}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>

          {pickerOpen && (
            <EmojiPickerPortal
              anchorRef={buttonRef}
              onSelect={handleToggle}
              onClose={closePicker}
            />
          )}
        </>
      )}
    </div>
  );
};

/**
 * Standalone "React" button meant to be displayed next to the "Reply" button
 * in the message actions row.
 */
type ReactionButtonProps = {
  messageId: Id<"messages">;
};

export const ReactionButton = ({ messageId }: ReactionButtonProps) => {
  const { t } = useTranslation("chat");
  const toggleReaction = useMutation(api.chat.functions.toggleReaction);
  const [pickerOpen, setPickerOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = useCallback(
    (emoji: string) => {
      void toggleReaction({ messageId, emoji }).catch((error) => {
        console.error("Failed to toggle reaction:", error);
      });
      setPickerOpen(false);
    },
    [messageId, toggleReaction]
  );

  const closePicker = useCallback(() => setPickerOpen(false), []);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setPickerOpen(!pickerOpen)}
        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
      >
        {t("react")}
      </button>

      {pickerOpen && (
        <EmojiPickerPortal
          anchorRef={buttonRef}
          onSelect={handleToggle}
          onClose={closePicker}
        />
      )}
    </>
  );
};
