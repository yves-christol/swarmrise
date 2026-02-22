import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

type ChatImageProps = {
  imageUrl: string;
};

/**
 * Inline image display for chat messages.
 * Renders a thumbnail that opens a lightbox on click.
 */
export const ChatImage = ({ imageUrl }: ChatImageProps) => {
  const { t } = useTranslation("chat");
  const [showLightbox, setShowLightbox] = useState(false);

  const openLightbox = useCallback(() => setShowLightbox(true), []);
  const closeLightbox = useCallback(() => setShowLightbox(false), []);

  // Close lightbox on Escape
  useEffect(() => {
    if (!showLightbox) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showLightbox, closeLightbox]);

  return (
    <>
      <button
        onClick={openLightbox}
        className="mt-1 block max-w-xs cursor-pointer rounded-lg overflow-hidden border border-border-default hover:border-highlight transition-colors focus:outline-none focus:ring-2 focus:ring-highlight"
        aria-label={t("imageOpenFull")}
      >
        <img
          src={imageUrl}
          alt={t("imageAttachment")}
          loading="lazy"
          className="max-w-full max-h-60 object-contain"
        />
      </button>

      {showLightbox && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70"
          onClick={closeLightbox}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageUrl}
              alt={t("imageAttachment")}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <button
              onClick={closeLightbox}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label={t("imageCloseFull")}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {/* Download link */}
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label={t("imageDownload")}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
