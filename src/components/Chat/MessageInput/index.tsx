import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { CreateTopicModal } from "./CreateTopicModal";
import { CreateVotingModal } from "./CreateVotingModal";
import { CreateElectionModal } from "./CreateElectionModal";

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

    void sendMessage({ channelId, text: trimmed }).then(() => {
      setText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }).catch((error) => {
      console.error("Failed to send message:", error);
    });
  }, [text, channelId, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
      if (e.key === "ArrowUp" && text === "") {
        document.dispatchEvent(new CustomEvent("chat:edit-last-message"));
      }
    },
    [handleSend, text]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    const lineHeight = 20;
    const maxLines = 4;
    const maxHeight = lineHeight * maxLines;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, []);

  if (isArchived) {
    return (
      <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
        {t("archivedChannel")}
      </div>
    );
  }

  return (
    <>
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-light dark:bg-dark">
        <div className="flex items-end gap-2">
          {/* Add tool button */}
          <div className="relative" ref={toolMenuRef}>
            <button
              onClick={() => setShowToolMenu((v) => !v)}
              className="shrink-0 p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-dark dark:hover:text-light hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={t("addTool")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {showToolMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-[180px] z-10">
                <button
                  onClick={() => {
                    setShowToolMenu(false);
                    setShowTopicModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-dark dark:text-light hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[#eac840] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  className="w-full text-left px-3 py-2 text-sm text-dark dark:text-light hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[#eac840] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  className="w-full text-left px-3 py-2 text-sm text-dark dark:text-light hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-[#eac840] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            className="flex-1 resize-none bg-slate-100 dark:bg-slate-800 text-dark dark:text-light rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            style={{ maxHeight: "80px" }}
          />
          {text.trim().length > 0 && (
            <button
              onClick={handleSend}
              className="shrink-0 p-2 rounded-lg bg-[#eac840] text-dark hover:bg-[#d4b435] transition-colors focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-1"
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
