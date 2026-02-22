import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { MessageItem } from "../MessageList/MessageItem";
import { MentionAutocomplete } from "../MessageInput/MentionAutocomplete";
import { useMentionInput, extractMentionIds } from "../MessageInput/useMentionInput";

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

type ThreadPanelProps = {
  messageId: Id<"messages">;
  channelId: Id<"channels">;
  orgaId: Id<"orgas">;
  onClose: () => void;
};

export const ThreadPanel = ({ messageId, channelId, orgaId, onClose }: ThreadPanelProps) => {
  const { t } = useTranslation("chat");
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const myMember = useQuery(api.members.functions.getMyMember, { orgaId });
  const currentMemberId = myMember?._id;

  const parentMessage = useQuery(api.chat.functions.getMessageById, { messageId });
  const replies = useQuery(api.chat.functions.getThreadReplies, { messageId });
  const sendThreadReply = useMutation(api.chat.functions.sendThreadReply);
  const generateUploadUrl = useMutation(api.storage.functions.generateUploadUrl);

  // Image upload state
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  // Collect all message IDs (parent + replies) for batch reaction query
  const allMessageIds = [
    messageId,
    ...(replies ?? []).map((r) => r._id),
  ];
  const reactionsData = useQuery(
    api.chat.functions.getReactionsForMessages,
    allMessageIds.length > 0 ? { messageIds: allMessageIds } : "skip"
  );

  const getReactions = (msgId: Id<"messages">) => {
    return reactionsData?.find((r) => r.messageId === msgId)?.reactions ?? [];
  };

  // Focus reply input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Scroll to bottom when new replies arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
  }, [replies?.length]);

  // Clean up preview URL on unmount or when image changes
  useEffect(() => {
    return () => {
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
      }
    };
  }, [pendingImage]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return;
    if (file.size > MAX_IMAGE_SIZE) return;

    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });

    if (fileInputRef.current) fileInputRef.current.value = "";
    textareaRef.current?.focus();
  }, [pendingImage]);

  const cancelImage = useCallback(() => {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
      setPendingImage(null);
    }
  }, [pendingImage]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingImage) return;

    setIsUploading(pendingImage !== null);

    try {
      let imageId: Id<"_storage"> | undefined;

      if (pendingImage) {
        const uploadUrl = await generateUploadUrl({ orgaId });
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": pendingImage.file.type },
          body: pendingImage.file,
        });
        const { storageId } = await result.json();
        imageId = storageId;
      }

      const resolvedText = trimmed ? resolveText(trimmed) : "";
      const mentions = resolvedText ? extractMentionIds(resolvedText) : [];

      await sendThreadReply({
        channelId,
        threadParentId: messageId,
        text: resolvedText,
        mentions: mentions.length > 0 ? mentions : undefined,
        imageId,
      });

      setText("");
      if (pendingImage) {
        URL.revokeObjectURL(pendingImage.previewUrl);
        setPendingImage(null);
      }
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    } catch (error) {
      console.error("Failed to send thread reply:", error);
    } finally {
      setIsUploading(false);
    }
  }, [text, pendingImage, channelId, messageId, orgaId, sendThreadReply, generateUploadUrl, resolveText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // When mention autocomplete is open, let it handle Enter/Tab/Arrow keys
      if (showMentionAutocomplete) {
        if (e.key === "Enter" || e.key === "Tab" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Escape") {
          return;
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend, showMentionAutocomplete]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);

    // Notify mention hook about text change
    handleTextChange(newText, e.target);

    const textarea = e.target;
    textarea.style.height = "auto";
    const maxHeight = 80;
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
  }, [handleTextChange]);

  // Close mention autocomplete when clicking outside
  useEffect(() => {
    if (!showMentionAutocomplete) return;
    const handleClick = (e: MouseEvent) => {
      // Don't close if the click is inside the autocomplete dropdown
      const target = e.target as HTMLElement;
      if (target.closest("[data-mention-autocomplete]")) return;
      closeMentionAutocomplete();
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [showMentionAutocomplete, closeMentionAutocomplete]);

  // Handle paste event for images in thread
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/") && ALLOWED_IMAGE_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (file && file.size <= MAX_IMAGE_SIZE) {
            e.preventDefault();
            if (pendingImage) {
              URL.revokeObjectURL(pendingImage.previewUrl);
            }
            const previewUrl = URL.createObjectURL(file);
            setPendingImage({ file, previewUrl });
          }
          break;
        }
      }
    };

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [pendingImage]);

  // Map members to autocomplete options
  const memberOptions = (members ?? []).map((m) => ({
    _id: m._id,
    firstname: m.firstname,
    surname: m.surname,
    pictureURL: m.pictureURL,
  }));

  const canSend = text.trim().length > 0 || pendingImage !== null;

  return (
    <div className="flex flex-col h-full bg-surface-primary">
      {/* Thread header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-default shrink-0">
        <span className="text-sm font-semibold text-dark dark:text-light">{t("thread")}</span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-surface-hover-strong transition-colors text-text-secondary"
          aria-label={t("closeThread")}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Parent message */}
      <div className="border-b border-border-default bg-surface-secondary">
        {parentMessage ? (
          <MessageItem message={parentMessage} isCompact={false} currentMemberId={currentMemberId} reactions={getReactions(parentMessage._id)} />
        ) : (
          <div className="p-3 text-sm text-text-secondary text-center">
            {t("loadingMessages")}
          </div>
        )}
      </div>

      {/* Replies */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {replies === undefined ? (
          <div className="p-3 text-sm text-text-secondary text-center">
            {t("loadingMessages")}
          </div>
        ) : replies.length === 0 ? (
          <div className="p-3 text-sm text-text-secondary text-center">
            {t("noReplies")}
          </div>
        ) : (
          replies.map((reply, idx) => {
            const prevReply = idx > 0 ? replies[idx - 1] : null;
            const isCompact =
              prevReply !== null &&
              prevReply.authorId === reply.authorId &&
              reply._creationTime - prevReply._creationTime < 5 * 60 * 1000;
            return <MessageItem key={reply._id} message={reply} isCompact={isCompact} currentMemberId={currentMemberId} reactions={getReactions(reply._id)} />;
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="p-3 border-t border-border-default shrink-0">
        {/* Image preview in thread */}
        {pendingImage && (
          <div className="mb-2 relative inline-block">
            <img
              src={pendingImage.previewUrl}
              alt={t("imagePreview")}
              className="max-h-24 max-w-36 rounded-lg border border-border-default object-contain"
            />
            <button
              onClick={cancelImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              aria-label={t("imageRemove")}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Image picker button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 p-2 rounded-lg text-text-tertiary hover:text-dark dark:hover:text-light hover:bg-surface-hover transition-colors"
            aria-label={t("imageAttach")}
            disabled={isUploading}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={handleImageSelect}
            className="hidden"
            aria-hidden="true"
          />

          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={pendingImage ? t("imageCaption") : t("reply")}
            rows={1}
            className="flex-1 resize-none bg-surface-secondary text-dark dark:text-light rounded-lg px-3 py-2 text-sm placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
            style={{ maxHeight: "80px" }}
          />
          {canSend && (
            <button
              onClick={() => void handleSend()}
              disabled={isUploading}
              className="shrink-0 p-2 rounded-lg bg-highlight text-dark hover:bg-highlight-hover transition-colors focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={t("sendMessage")}
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-dark border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
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
    </div>
  );
};
