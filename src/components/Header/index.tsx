import { useState } from "react";
import { dark } from "@clerk/themes";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { useQuery } from "convex/react";
import { Link } from "react-router";
import { api } from "../../../convex/_generated/api";
import { Logo } from "../Logo";
import { ChatToggle } from "../ChatToggle";
import { NotificationBell } from "../NotificationBell";
import { HeaderViewToggle } from "../NavBar/HeaderViewToggle";
import { SearchPanel } from "../NavBar/SearchPanel";
import { useTheme } from "../../contexts/ThemeContext";
import { useSelectedOrga } from "../../tools/orgaStore/hooks";
import { useFocus } from "../../tools/orgaStore/hooks";
import { routes } from "../../routes";
import {
  supportedLanguages,
  languageNames,
  type SupportedLanguage,
} from "../../i18n";

// Placeholder icon for orgs without logos
const OrgPlaceholderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
  </svg>
);

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

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

/**
 * Resolves the display name for the currently focused entity.
 */
const useFocusedEntityName = () => {
  const { t } = useTranslation("common");
  const { focus } = useFocus();
  const { selectedOrga } = useSelectedOrga();

  const teamId = focus.type === "team" ? focus.teamId : undefined;
  const roleId = focus.type === "role" ? focus.roleId : undefined;
  const memberId = focus.type === "member" ? focus.memberId : undefined;

  const team = useQuery(
    api.teams.functions.getTeamById,
    teamId ? { teamId } : "skip"
  );

  const role = useQuery(
    api.roles.functions.getRoleById,
    roleId ? { roleId } : "skip"
  );

  const member = useQuery(
    api.members.functions.getMemberById,
    memberId ? { memberId } : "skip"
  );

  if (focus.type === "orga") {
    return selectedOrga?.name ?? t("loading");
  }
  if (focus.type === "team") {
    return team?.name ?? t("loading");
  }
  if (focus.type === "role") {
    return role?.title ?? t("loading");
  }
  if (focus.type === "member") {
    return member ? `${member.firstname} ${member.surname}` : t("loading");
  }
  return "";
};

export const Header = () => {
  const { t } = useTranslation();
  const { isSignedIn } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { selectedOrgaId, selectedOrga, myMember, isSwitchingOrga } = useSelectedOrga();
  const { focus, focusOnOrga } = useFocus();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const focusedEntityName = useFocusedEntityName();

  const handleLogoClick = () => {
    if (focus.type !== "orga") {
      focusOnOrga();
    }
  };

  return (
    <header className="flex-shrink-0 z-30 bg-light dark:bg-dark px-4 py-2 border-b-2 border-slate-300 dark:border-slate-800 relative flex items-center gap-2">
      {/* LEFT: Logo */}
      {!selectedOrga ? (
        <Link
          to="/glossary"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <Logo size={24} begin={2} repeatCount={1} />
          <b className="font-swarm text-dark dark:text-light">
            swarmrise
          </b>
        </Link>
      ) : (
        <button
          onClick={handleLogoClick}
          disabled={isSwitchingOrga}
          className={`flex items-center gap-2 flex-shrink-0 rounded-md px-2 py-1 transition-colors
            focus:outline-none focus:ring-2 focus:ring-[#eac840]
            ${focus.type === "orga" ? "" : "hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"}`}
          aria-label={selectedOrga.name}
        >
          {selectedOrga.logoUrl ? (
            <img
              src={selectedOrga.logoUrl}
              alt=""
              className="w-6 h-6 rounded object-contain"
            />
          ) : (
            <OrgPlaceholderIcon className="w-5 h-5 text-gray-400" />
          )}
        </button>
      )}

      {/* LEFT: Focused entity name + search button (next to logo) */}
      {isSignedIn && selectedOrga && (
        <div className="flex items-center gap-1">
          <span className="text-sm text-dark dark:text-light truncate max-w-[160px] hidden sm:block">
            {focusedEntityName}
          </span>
          <div className="relative">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-1.5 rounded-md transition-colors
                focus:outline-none focus:ring-2 focus:ring-[#eac840]
                hover:bg-slate-200 dark:hover:bg-slate-700
                text-gray-500 dark:text-gray-400"
              aria-label={t("search")}
              aria-haspopup="dialog"
              aria-expanded={isSearchOpen}
            >
              <SearchIcon className="w-5 h-5" />
            </button>
            <SearchPanel
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
            />
          </div>
        </div>
      )}

      {/* CENTER: View toggle (absolutely centered) */}
      {isSignedIn && selectedOrga && (
        <div className="absolute left-1/2 -translate-x-1/2">
          <HeaderViewToggle />
        </div>
      )}

      {/* Spacer to push utilities to the right */}
      <div className="flex-1" />

      {/* Utilities: Chat + Notifications */}
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
