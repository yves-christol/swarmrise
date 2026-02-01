import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  supportedLanguages,
  languageNames,
  type SupportedLanguage,
} from "../../i18n";

const GlobeIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLanguage = i18n.language as SupportedLanguage;

  const handleLanguageChange = (lang: SupportedLanguage) => {
    void i18n.changeLanguage(lang);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t("common:selectLanguage", "Select language")}
      >
        <GlobeIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50"
          role="listbox"
          aria-label={t("common:availableLanguages", "Available languages")}
        >
          <div className="py-1">
            {supportedLanguages.map((lang) => (
              <button
                key={lang}
                role="option"
                aria-selected={currentLanguage === lang}
                onClick={() => handleLanguageChange(lang)}
                className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left ${
                  currentLanguage === lang ? "bg-gray-100 dark:bg-gray-700" : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="text-dark dark:text-light">{languageNames[lang]}</span>
                {currentLanguage === lang && (
                  <CheckIcon className="w-5 h-5 text-[#eac840]" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
