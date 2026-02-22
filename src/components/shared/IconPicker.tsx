import { useState, useMemo, useEffect } from "react";
import type { Icon } from "../Icons/icons";

type IconPickerProps = {
  selectedIconKey: string;
  onSelect: (iconKey: string) => void;
};

export function IconPicker({ selectedIconKey, onSelect }: IconPickerProps) {
  const [search, setSearch] = useState("");
  const [iconDict, setIconDict] = useState<Record<string, Icon> | null>(null);
  const [iconKeys, setIconKeys] = useState<string[]>([]);

  // Lazy-load the full icon dictionary only when the picker is mounted
  useEffect(() => {
    void import("../Icons/icons").then((m) => {
      setIconDict(m.iconDict);
      setIconKeys(m.icons);
    });
  }, []);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return iconKeys;
    const term = search.toLowerCase();
    return iconKeys.filter((key) => key.toLowerCase().includes(term));
  }, [search, iconKeys]);

  if (!iconDict) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-text-tertiary">
        Loading icons...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search icons..."
        className="
          w-full px-3 py-2 text-sm
          border border-border-strong
          rounded-lg
          bg-surface-primary
          text-dark dark:text-light
          focus:outline-none focus:ring-2 focus:ring-highlight
        "
      />

      {/* Icons grid */}
      <div
        className="grid grid-cols-8 gap-1 overflow-y-auto p-1"
        style={{ maxHeight: "240px" }}
      >
        {filteredIcons.map((key) => {
          const isSelected = key === selectedIconKey;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              title={key}
              className={`
                flex items-center justify-center
                w-9 h-9 rounded-md
                transition-colors duration-75
                cursor-pointer border-none
                ${isSelected
                  ? "bg-highlight/20 ring-2 ring-highlight"
                  : "bg-surface-secondary hover:bg-surface-hover-strong"
                }
              `}
            >
              <svg width="24" height="24" viewBox="0 0 40 40">
                <path
                  d={iconDict[key].path}
                  fill="currentColor"
                  className={
                    isSelected
                      ? "text-highlight-hover dark:text-highlight"
                      : "text-text-secondary"
                  }
                />
              </svg>
            </button>
          );
        })}
        {filteredIcons.length === 0 && (
          <p className="col-span-8 text-center text-sm text-text-tertiary py-4">
            No icons found
          </p>
        )}
      </div>
    </div>
  );
}
