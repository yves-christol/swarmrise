import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";

const SunIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

export const ThemeToggle = () => {
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[#eac840] focus:ring-offset-2 focus:ring-offset-light dark:focus:ring-offset-dark"
      aria-label={
        isDark
          ? t("common:switchToLightMode", "Switch to light mode")
          : t("common:switchToDarkMode", "Switch to dark mode")
      }
    >
      <div className="relative w-5 h-5">
        <SunIcon
          className={`absolute inset-0 w-5 h-5 text-gray-600 dark:text-gray-400 transition-opacity duration-150 ${
            isDark ? "opacity-100" : "opacity-0"
          }`}
        />
        <MoonIcon
          className={`absolute inset-0 w-5 h-5 text-gray-600 dark:text-gray-400 transition-opacity duration-150 ${
            isDark ? "opacity-0" : "opacity-100"
          }`}
        />
      </div>
    </button>
  );
};
