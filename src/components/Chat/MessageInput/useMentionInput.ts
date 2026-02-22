import { useState, useCallback, useRef } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import type { MemberOption } from "./MentionAutocomplete";

/**
 * Mention syntax in message text: @[Firstname Surname](memberId)
 * This is stored in the message text and parsed by the MessageText renderer.
 */
export const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Extract all member IDs from a text containing mention syntax.
 */
export function extractMentionIds(text: string): Id<"members">[] {
  const ids: Id<"members">[] = [];
  const regex = new RegExp(MENTION_REGEX.source, "g");
  let match;
  while ((match = regex.exec(text)) !== null) {
    ids.push(match[2] as Id<"members">);
  }
  return [...new Set(ids)];
}

type UseMentionInputReturn = {
  /** Whether the autocomplete dropdown should be shown */
  showMentionAutocomplete: boolean;
  /** The current filter string (text after @) */
  mentionFilter: string;
  /** Position for the dropdown */
  mentionPosition: { bottom: number; left: number };
  /** Call this whenever the textarea value changes */
  handleTextChange: (text: string, textarea: HTMLTextAreaElement) => void;
  /** Call this when a member is selected from the autocomplete */
  handleMentionSelect: (member: MemberOption, setText: (value: string) => void, textarea: HTMLTextAreaElement) => void;
  /** Call this to close the autocomplete */
  closeMentionAutocomplete: () => void;
  /** Convert display text (@Name) to storage syntax (@[Name](id)) before sending */
  resolveText: (text: string) => string;
};

/**
 * Hook that manages @mention detection and insertion for a textarea.
 *
 * How it works:
 * 1. As the user types, we detect when "@" is typed at a word boundary
 * 2. We track the text after "@" as a filter for the autocomplete
 * 3. When a member is selected, we replace the "@filter" with the mention syntax
 */
export function useMentionInput(): UseMentionInputReturn {
  const [showMentionAutocomplete, setShowMentionAutocomplete] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ bottom: 0, left: 0 });

  // Track the cursor position where the @ trigger started
  const mentionStartRef = useRef<number>(-1);

  // Track the last known cursor position (reliable even if textarea loses focus)
  const cursorPosRef = useRef<number>(0);

  // Map display names to member IDs for resolving at send time
  const trackedMentionsRef = useRef<Map<string, Id<"members">>>(new Map());

  const closeMentionAutocomplete = useCallback(() => {
    setShowMentionAutocomplete(false);
    setMentionFilter("");
    mentionStartRef.current = -1;
  }, []);

  const handleTextChange = useCallback(
    (text: string, textarea: HTMLTextAreaElement) => {
      const cursorPos = textarea.selectionStart;
      cursorPosRef.current = cursorPos;

      // Find the @ that triggers the autocomplete.
      // Walk backward from cursor to find a potential @ trigger.
      if (cursorPos > 0) {
        let atPos = -1;
        for (let i = cursorPos - 1; i >= 0; i--) {
          const ch = text[i];
          // Stop at whitespace or newline -- the @ must be in the same "word"
          if (ch === "\n" || ch === "\r") break;
          if (ch === "@") {
            // Check that @ is at start of text or preceded by whitespace
            if (i === 0 || /\s/.test(text[i - 1])) {
              atPos = i;
            }
            break;
          }
          // If we hit a closing bracket/paren, this might be part of a completed mention -- skip
          if (ch === ")" || ch === "]") break;
        }

        if (atPos >= 0) {
          const filterText = text.slice(atPos + 1, cursorPos);

          // Don't re-trigger autocomplete for already-completed mentions
          const isCompletedMention = Array.from(trackedMentionsRef.current.keys()).some(
            (name) => filterText === name || filterText.startsWith(name + " ")
          );

          if (!isCompletedMention) {
            mentionStartRef.current = atPos;
            setMentionFilter(filterText);
            setShowMentionAutocomplete(true);

            // Calculate dropdown position relative to viewport
            const rect = textarea.getBoundingClientRect();
            setMentionPosition({
              bottom: window.innerHeight - rect.top + 4,
              left: rect.left,
            });
            return;
          }
        }
      }

      // No active mention trigger
      if (showMentionAutocomplete) {
        closeMentionAutocomplete();
      }
    },
    [showMentionAutocomplete, closeMentionAutocomplete]
  );

  const handleMentionSelect = useCallback(
    (
      member: MemberOption,
      setText: (value: string) => void,
      textarea: HTMLTextAreaElement
    ) => {
      const startPos = mentionStartRef.current;
      if (startPos < 0) return;

      const currentText = textarea.value;
      const cursorPos = cursorPosRef.current;

      // Insert just @Name in the textarea (no brackets or ID)
      const displayName = `${member.firstname} ${member.surname}`;
      const mentionText = `@${displayName} `;
      const newText =
        currentText.slice(0, startPos) + mentionText + currentText.slice(cursorPos);

      // Track name → ID mapping for resolving at send time
      trackedMentionsRef.current.set(displayName, member._id);

      setText(newText);

      // Move cursor to after the mention
      const newCursorPos = startPos + mentionText.length;
      // Need to use requestAnimationFrame because React may not have updated the textarea value yet
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });

      closeMentionAutocomplete();
    },
    [closeMentionAutocomplete]
  );

  /**
   * Convert display text containing @Name into storage syntax @[Name](id).
   * Called right before sending the message.
   */
  const resolveText = useCallback((text: string): string => {
    let resolved = text;
    for (const [name, id] of trackedMentionsRef.current) {
      const pattern = `@${name}`;
      if (resolved.includes(pattern)) {
        resolved = resolved.split(pattern).join(`@[${name}](${id})`);
      }
    }
    return resolved;
  }, []);

  return {
    showMentionAutocomplete,
    mentionFilter,
    mentionPosition,
    handleTextChange,
    handleMentionSelect,
    closeMentionAutocomplete,
    resolveText,
  };
}
