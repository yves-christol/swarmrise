import { useState, useRef, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { CreateTopicModal } from "./CreateTopicModal";
import { CreateVotingModal } from "./CreateVotingModal";
import { CreateElectionModal } from "./CreateElectionModal";
import { CreateLotteryModal } from "./CreateLotteryModal";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { useMentionInput, extractMentionIds } from "./useMentionInput";

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/svg+xml",
  "image/webp",
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

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
  const [showLotteryModal, setShowLotteryModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useMutation(api.chat.functions.sendMessage);
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

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      console.error("Unsupported image type:", file.type);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      console.error("Image too large:", file.size);
      return;
    }

    // Revoke previous preview URL if any
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingImage({ file, previewUrl });

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Focus textarea for optional caption
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
    // Need either text or image
    if (!trimmed && !pendingImage) return;

    setIsUploading(pendingImage !== null);

    try {
      let imageId: Id<"_storage"> | undefined;

      // Upload image first if present
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

      // Resolve @Name display text to @[Name](id) storage syntax
      const resolvedText = trimmed ? resolveText(trimmed) : "";
      const mentions = resolvedText ? extractMentionIds(resolvedText) : [];

      await sendMessage({
        channelId,
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
      console.error("Failed to send message:", error);
    } finally {
      setIsUploading(false);
    }
  }, [text, pendingImage, channelId, orgaId, sendMessage, generateUploadUrl, resolveText]);

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
        void handleSend();
      }
      if (e.key === "ArrowUp" && text === "" && !pendingImage) {
        document.dispatchEvent(new CustomEvent("chat:edit-last-message"));
      }
    },
    [handleSend, text, showMentionAutocomplete, pendingImage]
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

  // Handle paste event for images
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

  const canSend = text.trim().length > 0 || pendingImage !== null;

  return (
    <>
      <div className="p-3 border-t border-border-default bg-surface-primary">
        {/* Image preview */}
        {pendingImage && (
          <div className="mb-2 relative inline-block">
            <img
              src={pendingImage.previewUrl}
              alt={t("imagePreview")}
              className="max-h-32 max-w-48 rounded-lg border border-border-default object-contain"
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
                <button
                  onClick={() => {
                    setShowToolMenu(false);
                    setShowLotteryModal(true);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-dark dark:text-light hover:bg-surface-hover transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-highlight shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="3" />
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                  {t("lotteryTool")}
                </button>
              </div>
            )}
          </div>

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
            placeholder={pendingImage ? t("imageCaption") : t("typeMessage")}
            aria-label={t("typeMessage")}
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

      {showLotteryModal && (
        <CreateLotteryModal
          channelId={channelId}
          onClose={() => setShowLotteryModal(false)}
        />
      )}
    </>
  );
};
