import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Logo } from "../Logo";

type NotFoundProps = {
  /** The type of entity that wasn't found */
  entityType: "team" | "role" | "member" | "organization";
  /** Optional callback when user clicks back/parent navigation */
  onNavigateBack?: () => void;
  /** Optional path to navigate to (alternative to onNavigateBack) */
  backTo?: string;
  /** Optional label for the back button */
  backLabel?: string;
};

export function NotFound({
  entityType,
  onNavigateBack,
  backTo,
  backLabel,
}: NotFoundProps) {
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  const handleBack = () => {
    if (onNavigateBack) {
      onNavigateBack();
    } else if (backTo) {
      void navigate(backTo);
    } else {
      void navigate("/");
    }
  };

  const getMessage = () => {
    switch (entityType) {
      case "team":
        return t("notFound.team");
      case "role":
        return t("notFound.role");
      case "member":
        return t("notFound.member");
      case "organization":
        return t("notFound.organization");
      default:
        return t("notFound.generic");
    }
  };

  const getDescription = () => {
    switch (entityType) {
      case "team":
        return t("notFound.teamDescription");
      case "role":
        return t("notFound.roleDescription");
      case "member":
        return t("notFound.memberDescription");
      case "organization":
        return t("notFound.organizationDescription");
      default:
        return t("notFound.genericDescription");
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-light dark:bg-dark">
      <div className="flex flex-col items-center gap-6 max-w-md text-center px-4">
        <Logo size={64} begin={0} repeatCount={1} />

        <div className="flex flex-col gap-2">
          <h1 className="font-swarm text-2xl font-bold text-dark dark:text-light">
            {getMessage()}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {getDescription()}
          </p>
        </div>

        <button
          onClick={handleBack}
          className="
            flex items-center gap-2 px-4 py-2
            bg-highlight hover:bg-highlight-hover
            text-dark font-medium rounded-lg
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-highlight focus:ring-offset-2
            dark:focus:ring-offset-dark
          "
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 12L6 8L10 4" />
          </svg>
          {backLabel || t("notFound.goBack")}
        </button>
      </div>
    </div>
  );
}
