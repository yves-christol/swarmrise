import { dark } from "@clerk/themes";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Logo } from "../Logo";
import { OrgaSelector } from "../OrgaSelector";
import { LanguageSelector } from "../LanguageSelector";
import { ThemeToggle } from "../ThemeToggle";
import { NotificationBell } from "../NotificationBell";
import { useTheme } from "../../contexts/ThemeContext";

type HeaderProps = {
  showBackButton?: boolean;
};

export const Header = ({ showBackButton = false }: HeaderProps) => {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const { resolvedTheme } = useTheme();

  return (
    <header className="flex-shrink-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-300 dark:border-slate-800 flex flex-row justify-between items-center">
      {/* Left side: Back button or Logo/brand */}
      {showBackButton ? (
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity text-dark dark:text-light"
          aria-label={t("back")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">{t("back")}</span>
        </Link>
      ) : (
        <Link
          to="/glossary"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label={t("governance:glossary.title", "swarmrise glossary")}
        >
          <Logo size={24} begin={2} repeatCount={1} />
          <b className="font-swarm text-dark dark:text-light">swarmrise</b>
        </Link>
      )}

      {/* Center: Organization selector (only when signed in) */}
      {isSignedIn && (
        <div className="flex-1 flex justify-center">
          <OrgaSelector />
        </div>
      )}

      {/* Right side: Utility icons + User button */}
      <div className="flex items-center gap-4">
        {/* Utility icons cluster */}
        <div className="flex items-center gap-2">
          <LanguageSelector />
          <ThemeToggle />
          <NotificationBell />
        </div>
        {/* User identity */}
        {isSignedIn && <UserButton appearance={{ baseTheme: resolvedTheme === "dark" ? dark : undefined }} />}
      </div>
    </header>
  );
};
