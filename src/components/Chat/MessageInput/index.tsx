import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

type MessageInputProps = {
  channelId: Id<"channels">;
  isArchived: boolean;
};

export const MessageInput = ({ channelId, isArchived }: MessageInputProps) => {
  const { t } = useTranslation("chat");
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useMutation(api.chat.functions.sendMessage);

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
    },
    [handleSend]
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
    <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-light dark:bg-dark">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t("typeMessage")}
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
  );
};
