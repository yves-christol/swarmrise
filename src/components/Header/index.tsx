import { dark } from "@clerk/themes";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Logo } from "../Logo";
import { OrgaSelector } from "../OrgaSelector";
import { NotificationBell } from "../NotificationBell";
import { ChatToggle } from "../ChatToggle";
import { ChevronSeparator } from "../NavBar/ChevronSeparator";
import { TeamSelector } from "../NavBar/TeamSelector";
import { RoleSelector } from "../NavBar/RoleSelector";
import { HeaderViewToggle } from "../NavBar/HeaderViewToggle";
import { NavOverflowMenu } from "../NavBar/NavOverflowMenu";
import { useTheme } from "../../contexts/ThemeContext";
import { useSelectedOrga } from "../../tools/orgaStore/hooks";
import { useFocus } from "../../tools/orgaStore/hooks";
import { routes } from "../../routes";
import {
  supportedLanguages,
  languageNames,
  type SupportedLanguage,
} from "../../i18n";

const ProfileIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SunIcon = () => (
  <svg
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

const MoonIcon = () => (
  <svg
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

const GlobeIcon = () => (
  <svg
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

const LanguagePage = () => {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language as SupportedLanguage;

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-4">
        {t("selectLanguage")}
      </h1>
      <div className="flex flex-col gap-1">
        {supportedLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => void i18n.changeLanguage(lang)}
            className={`flex items-center justify-between px-4 py-3 rounded-lg transition-colors text-left ${
              currentLanguage === lang
                ? "bg-gray-100 dark:bg-gray-700 font-medium"
                : "hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
          >
            <span>{languageNames[lang]}</span>
            {currentLanguage === lang && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5 text-[#eac840]"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

type HeaderProps = {
  showBackButton?: boolean;
};

export const Header = ({ showBackButton = false }: HeaderProps) => {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { selectedOrgaId, selectedOrga, myMember } = useSelectedOrga();
  const { focus } = useFocus();

  const isDark = resolvedTheme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const showTeamSelector = focus.type === "team" || focus.type === "role";
  const showRoleSelector = focus.type === "role";

  return (
    <header className="flex-shrink-0 z-30 bg-light dark:bg-dark px-4 py-2 border-b-2 border-slate-300 dark:border-slate-800 flex items-center gap-1">
      {/* Left: Logo (always) */}
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
      ) : !selectedOrga ? (
        <Link
          to="/glossary"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <Logo size={24} begin={2} repeatCount={1} />
          <b className="font-swarm text-dark dark:text-light">
            swarmrise
          </b>
        </Link>
      ) : null}

      {/* Navigation selectors (signed in + org selected) */}
      {isSignedIn && selectedOrga && (
        <>
          <ChevronSeparator />
          <OrgaSelector />

          {/* Desktop nav: team, role */}
          <div className="hidden md:contents">
            {showTeamSelector && (
              <>
                <ChevronSeparator />
                <TeamSelector />
              </>
            )}
            {showRoleSelector && (
              <>
                <ChevronSeparator />
                <RoleSelector />
              </>
            )}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* View toggle - desktop only */}
      {isSignedIn && selectedOrga && (
        <div className="hidden md:flex">
          <HeaderViewToggle />
        </div>
      )}

      {/* Mobile overflow */}
      {isSignedIn && selectedOrga && (
        <div className="md:hidden">
          <NavOverflowMenu />
        </div>
      )}

      {/* Right: utilities */}
      <div className="flex items-center gap-2">
        <ChatToggle />
        <NotificationBell />
      </div>

      {/* User identity */}
      {isSignedIn && (
        <UserButton appearance={{ baseTheme: resolvedTheme === "dark" ? dark : undefined }}>
          <UserButton.MenuItems>
            {selectedOrgaId && myMember && (
              <UserButton.Link
                label={t("myPage")}
                labelIcon={<ProfileIcon />}
                href={routes.member(selectedOrgaId, myMember._id)}
              />
            )}
            <UserButton.Action label="manageAccount" />
            <UserButton.Action
              label={isDark ? t("switchToLightMode") : t("switchToDarkMode")}
              labelIcon={isDark ? <SunIcon /> : <MoonIcon />}
              onClick={toggleTheme}
            />
            <UserButton.Action
              label={t("language")}
              labelIcon={<GlobeIcon />}
              open="language"
            />
            <UserButton.Action label="signOut" />
          </UserButton.MenuItems>
          <UserButton.UserProfilePage
            label={t("language")}
            labelIcon={<GlobeIcon />}
            url="language"
          >
            <LanguagePage />
          </UserButton.UserProfilePage>
        </UserButton>
      )}
    </header>
  );
};
