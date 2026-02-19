import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useChatStore } from "../../../tools/chatStore/hooks";
import { SpinnerIcon } from "../../Icons";
/** Strip markdown syntax for clean plaintext search previews. */
function stripMarkdown(text: string): string {
  return text
    // mentions: @[Name](id) → @Name
    .replace(/@\[([^\]]+)\]\([^)]+\)/g, "@$1")
    // bold/italic
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // strikethrough
    .replace(/~~([^~]+)~~/g, "$1")
    // inline code
    .replace(/`([^`]+)`/g, "$1")
    // links: [text](url) → text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // blockquote markers
    .replace(/^>\s?/gm, "")
    // heading markers
    .replace(/^#{1,6}\s/gm, "");
}

type SearchPanelProps = {
  orgaId: Id<"orgas">;
  channelId: Id<"channels"> | null;
};

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const SearchPanel = ({ orgaId, channelId }: SearchPanelProps) => {
  const { t } = useTranslation("chat");
  const { closeSearch, selectChannel } = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "channel">("all");
  const debouncedQuery = useDebounce(query, 300);

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchChannelId = scope === "channel" && channelId ? channelId : undefined;

  const results = useQuery(
    api.chat.functions.searchMessages,
    debouncedQuery.length >= 2
      ? { orgaId, query: debouncedQuery, channelId: searchChannelId }
      : "skip"
  );

  const isLoading = debouncedQuery.length >= 2 && results === undefined;
  const hasQuery = debouncedQuery.length >= 2;
  const hasResults = results !== undefined && results.length > 0;

  const handleResultClick = useCallback(
    (resultChannelId: Id<"channels">) => {
      closeSearch();
      selectChannel(resultChannelId);
    },
    [closeSearch, selectChannel]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0" role="search">
      {/* Search input */}
      <div className="p-3 border-b border-border-default">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            role="searchbox"
            aria-label={t("searchMessages")}
            className="w-full pl-10 pr-8 py-2 text-sm bg-surface-secondary text-dark dark:text-light rounded-lg placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-1 focus:ring-offset-light dark:focus:ring-offset-dark"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-surface-hover-strong text-text-tertiary"
              aria-label="Clear"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Scope toggle */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setScope("all")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              scope === "all"
                ? "bg-highlight text-dark"
                : "text-text-secondary hover:bg-surface-hover"
            }`}
          >
            {t("allChannels")}
          </button>
          {channelId && (
            <button
              onClick={() => setScope("channel")}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                scope === "channel"
                  ? "bg-highlight text-dark"
                  : "text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {t("thisChannel")}
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <SpinnerIcon className="w-5 h-5 text-gray-400" />
          </div>
        )}

        {hasQuery && !isLoading && !hasResults && (
          <div className="flex items-center justify-center py-8 text-sm text-text-secondary">
            {t("noSearchResults")}
          </div>
        )}

        {hasResults && (
          <>
            <div className="px-3 py-2 text-xs text-text-secondary" aria-live="polite">
              {t("searchResultCount", { count: results.length })}
            </div>
            {results.map((result) => (
              <button
                key={result._id}
                onClick={() => handleResultClick(result.channelId)}
                className="w-full text-left px-3 py-2.5 hover:bg-surface-hover-subtle transition-colors border-b border-border-default last:border-b-0"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-dark dark:text-light">
                    {result.authorName}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {formatRelativeTime(result._creationTime)}
                  </span>
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-surface-secondary text-text-secondary">
                    {result.channelName}
                  </span>
                </div>
                <p className="text-sm text-text-description truncate">
                  {(() => {
                    const clean = stripMarkdown(result.text);
                    return clean.length > 100 ? clean.slice(0, 100) + "..." : clean;
                  })()}
                  {result.isEdited && (
                    <span className="text-xs text-text-tertiary italic ml-1">
                      ({t("edited")})
                    </span>
                  )}
                </p>
              </button>
            ))}
          </>
        )}

        {!hasQuery && (
          <div className="flex items-center justify-center py-8 text-sm text-text-secondary">
            {t("searchPlaceholder")}
          </div>
        )}
      </div>
    </div>
  );
};
