import { useState, useCallback, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

type EmailDomainsInputProps = {
  domains: string[];
  onChange: (domains: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
};

const XIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
  </svg>
);

/**
 * Validates a domain format.
 * Returns true if the domain appears valid (has a dot, no invalid chars, etc.)
 */
function isValidDomain(domain: string): boolean {
  const cleaned = domain.trim().toLowerCase();
  if (cleaned.length === 0) return false;
  if (!cleaned.includes(".")) return false;
  if (cleaned.startsWith(".") || cleaned.endsWith(".")) return false;
  if (cleaned.includes("..")) return false;
  if (cleaned.length > 253) return false;
  if (!/^[a-z0-9.-]+$/.test(cleaned)) return false;
  const labels = cleaned.split(".");
  for (const label of labels) {
    if (label.startsWith("-") || label.endsWith("-")) return false;
    if (label.length === 0) return false;
  }
  return true;
}

/**
 * Normalizes a domain (trims, lowercases).
 */
function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase();
}

export function EmailDomainsInput({
  domains,
  onChange,
  disabled = false,
  compact = false,
}: EmailDomainsInputProps) {
  const { t } = useTranslation("orgs");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addDomain = useCallback(() => {
    const normalized = normalizeDomain(inputValue);
    if (!normalized) {
      setInputValue("");
      return;
    }

    if (!isValidDomain(normalized)) {
      setError(t("authorizedDomainsInvalidFormat"));
      return;
    }

    // Check for duplicates
    if (domains.includes(normalized)) {
      setInputValue("");
      setError(null);
      return;
    }

    onChange([...domains, normalized]);
    setInputValue("");
    setError(null);
  }, [inputValue, domains, onChange, t]);

  const removeDomain = useCallback(
    (domainToRemove: string) => {
      onChange(domains.filter((d) => d !== domainToRemove));
    },
    [domains, onChange]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addDomain();
    }
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className={`font-medium text-dark dark:text-light ${compact ? "text-sm" : "text-sm"}`}>
        {t("authorizedDomainsLabel")}
      </label>

      {/* Domain chips */}
      {domains.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {domains.map((domain) => (
            <span
              key={domain}
              className="
                inline-flex items-center gap-1
                px-2.5 py-1
                bg-[#eac840]/20 dark:bg-[#eac840]/10
                text-dark dark:text-light
                text-sm
                rounded-full
                border border-[#eac840]/30 dark:border-[#eac840]/20
              "
            >
              {domain}
              <button
                type="button"
                onClick={() => removeDomain(domain)}
                disabled={disabled}
                className="
                  p-0.5 rounded-full
                  hover:bg-[#eac840]/30 dark:hover:bg-[#eac840]/20
                  transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                aria-label={`Remove ${domain}`}
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={t("authorizedDomainsPlaceholder")}
          className={`
            flex-1
            px-3 py-2
            rounded-md border
            bg-white dark:bg-gray-900
            text-dark dark:text-light
            text-sm
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-[#eac840]
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300 dark:border-gray-600"}
          `}
        />
        <button
          type="button"
          onClick={addDomain}
          disabled={disabled || !inputValue.trim()}
          className="
            px-3 py-2
            bg-[#eac840] hover:bg-[#d4af37]
            text-dark
            font-medium
            text-sm
            rounded-md
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center gap-1
          "
        >
          <PlusIcon className="w-4 h-4" />
          {t("authorizedDomainsAddButton")}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Helper text */}
      <p className="text-xs text-gray-400">
        {domains.length === 0
          ? t("authorizedDomainsEmptyState")
          : t("authorizedDomainsHint")}
      </p>
    </div>
  );
}
