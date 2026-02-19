import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { CreateTopicModal } from "./CreateTopicModal";
import { CreateVotingModal } from "./CreateVotingModal";
import { CreateElectionModal } from "./CreateElectionModal";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { useMentionInput, extractMentionIds } from "./useMentionInput";

type MessageInputProps = {
  channelId: Id<"channels">;
  orgaId: Id<"orgas">;
  isArchived: boolean;
};

export const MessageInput = ({ channelId, orgaId, isArchived }: MessageInputProps) => {
  const { t } = useTranslation("chat");
  const [text, setText] = useState("");
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showElectionModal, setShowElectionModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const sendMessage = useMutation(api.chat.functions.sendMessage);

  // Fetch org members for @mention autocomplete
  const members = useQuery(api.members.functions.listMembers, { orgaId });

  // Mention autocomplete hook
  const {
    showMentionAutocomplete,
    mentionFilter,
    mentionPosition,
    handleTextChange,
    handleMentionSelect,
    closeMentionAutocomplete,
    resolveText,
  } = useMentionInput();

  // Focus textarea on mount (when chat opens or search closes)
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close tool menu on click outside
  useEffect(() => {
    if (!showToolMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (toolMenuRef.current && !toolMenuRef.current.contains(e.target as Node)) {
        setShowToolMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showToolMenu]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Resolve @Name display text to @[Name](id) storage syntax
    const resolvedText = resolveText(trimmed);
    const mentions = extractMentionIds(resolvedText);

    void sendMessage({
      channelId,
      text: resolvedText,
      mentions: mentions.length > 0 ? mentions : undefined,
    }).then(() => {
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }).catch((error) => {
      console.error("Failed to send message:", error);
    });
  }, [text, channelId, sendMessage, resolveText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // When mention autocomplete is open, let it handle Enter/Tab/Arrow keys
      if (showMentionAutocomplete) {
        if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Escape") {
          // These are handled by the MentionAutocomplete via document-level capture listener
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "ArrowUp" && text === "") {
        document.dispatchEvent(new CustomEvent("chat:edit-last-message"));
      }
    },
    [handleSend, text, showMentionAutocomplete]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Notify mention hook about text change
    handleTextChange(newText, e.target);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    const lineHeight = 20;
    const maxLines = 4;
    const maxHeight = lineHeight * maxLines;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [handleTextChange]);

  // Close mention autocomplete when clicking outside
  useEffect(() => {
    if (!showMentionAutocomplete) return;
    const handleClick = () => {
      closeMentionAutocomplete();
    };
    // Delay to avoid closing immediately on the click that triggered it
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [showMentionAutocomplete, closeMentionAutocomplete]);

  if (isArchived) {
    return (
      <div className="p-3 text-center text-sm text-text-secondary bg-surface-secondary border-t border-border-default">
        {t("archivedChannel")}
      </div>
    );
  }

  // Map members to autocomplete options
  const memberOptions = (members ?? []).map((m) => ({
    _id: m._id,
    firstname: m.firstname,
    surname: m.surname,
    pictureURL: m.pictureURL,
  }));

  return (
    <>
      <div className="p-3 border-t border-border-default bg-surface-primary">
        <div className="flex items-end gap-2">
          {/* Add tool button */}
          <div className="relative" ref={toolMenuRef}>
            <button
              onClick={() => setShowToolMenu((v) => !v)}
              className="shrink-0 p-2 rounded-lg text-text-tertiary hover:text-dark dark:hover:text-light hover:bg-surface-hover transition-colors"
              aria-label={t("addTool")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {showToolMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-surface-primary border border-border-default rounded-lg shadow-lg py-1 min-w-[180px] z-10">
                <button
                  onClick={() => {
                    setShowToolMenu(false);
                    setShowTopicModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-dark dark:text-light hover:bg-surface-hover transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-highlight shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  {t("consentDecision")}
                </button>
                <button
                  onClick={() => {
                    setShowToolMenu(false);
                    setShowVotingModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-dark dark:text-light hover:bg-surface-hover transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-highlight shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="18" rx="2" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                  {t("votingTool")}
                </button>
                <button
                  onClick={() => {
                    setShowToolMenu(false);
                    setShowElectionModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-dark dark:text-light hover:bg-surface-hover transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-highlight shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {t("electionTool")}
                </button>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            aria-label={t("typeMessage")}
            rows={1}
            className="flex-1 resize-none bg-surface-secondary text-dark dark:text-light rounded-lg px-3 py-2 text-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            style={{ maxHeight: "80px" }}
          />
          {text.trim().length > 0 && (
            <button
              onClick={handleSend}
              className="shrink-0 p-2 rounded-lg bg-highlight text-dark hover:bg-highlight-hover transition-colors focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1"
              aria-label={t("sendMessage")}
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mention autocomplete dropdown */}
      {showMentionAutocomplete && textareaRef.current && (
        <MentionAutocomplete
          members={memberOptions}
          filter={mentionFilter}
          position={mentionPosition}
          onSelect={(member) => {
            if (textareaRef.current) {
              handleMentionSelect(member, setText, textareaRef.current);
            }
          }}
          onClose={closeMentionAutocomplete}
        />
      )}

      {showTopicModal && (
        <CreateTopicModal
          channelId={channelId}
          onClose={() => setShowTopicModal(false)}
        />
      )}

      {showVotingModal && (
        <CreateVotingModal
          channelId={channelId}
          onClose={() => setShowVotingModal(false)}
        />
      )}

      {showElectionModal && (
        <CreateElectionModal
          channelId={channelId}
          orgaId={orgaId}
          onClose={() => setShowElectionModal(false)}
        />
      )}
    </>
  );
};
