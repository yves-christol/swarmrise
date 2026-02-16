import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Logo } from "../Logo";
import { useSelectedOrga } from "../../tools/orgaStore/hooks";

const BUTTON_CLASS =
  "fixed bottom-4 left-4 z-20 w-10 h-10 rounded-full bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 shadow-md flex items-center justify-center hover:scale-110 transition-transform";

export const FloatingLogo = () => {
  const { isSignedIn } = useAuth();
  const { selectedOrga } = useSelectedOrga();

  if (!isSignedIn || !selectedOrga) return null;

  return (
    <Link to="/glossary" className={BUTTON_CLASS} aria-label="swarmrise">
      <Logo size={28} begin={2} repeatCount={1} />
    </Link>
  );
};

export const FloatingBackButton = () => {
  const { t } = useTranslation();

  return (
    <Link
      to="/"
      className={`${BUTTON_CLASS} text-dark dark:text-light`}
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
    </Link>
  );
};
