import { useMemo } from "react";
import { MENTION_REGEX } from "../MessageInput/useMentionInput";

type MessageTextProps = {
  text: string;
};

/**
 * Parsed segment of message text.
 * Either plain text or a mention reference.
 */
type TextSegment =
  | { type: "text"; content: string }
  | { type: "mention"; displayName: string; memberId: string };

/**
 * Parse message text into segments, splitting on mention syntax.
 * Mention syntax: @[Firstname Surname](memberId)
 */
function parseMessageText(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = new RegExp(MENTION_REGEX.source, "g");
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add any text before this mention
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }

    // Add the mention segment
    segments.push({
      type: "mention",
      displayName: match[1],
      memberId: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last mention
  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Renders message text with @mentions highlighted.
 * Mention spans are styled with a gold background and bold text.
 * The component preserves whitespace and line breaks like the original text rendering.
 */
export const MessageText = ({ text }: MessageTextProps) => {
  const segments = useMemo(() => parseMessageText(text), [text]);

  // If there are no mentions, render as plain text (fast path)
  if (segments.length === 1 && segments[0].type === "text") {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, idx) => {
        if (segment.type === "text") {
          return <span key={idx}>{segment.content}</span>;
        }

        return (
          <span
            key={idx}
            className="inline-flex items-baseline gap-0.5 rounded px-0.5 py-px bg-highlight/15 text-gold dark:text-highlight font-medium cursor-default"
            title={`@${segment.displayName}`}
            data-member-id={segment.memberId}
          >
            @{segment.displayName}
          </span>
        );
      })}
    </>
  );
};
