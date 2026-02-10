import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { SignInForm } from "../SignInForm"

export const Anonymous = () => {
  const { t } = useTranslation("auth");

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      <h1 className="font-swarm text-4xl font-bold text-center">
        welcome!
      </h1>
      <p>
        <span className="font-swarm text-gold">swarmrise</span> is a light governance model, providing clarity and traceability in the organization and decision process without the burden of bureaucracy.
      </p>
      <SignInForm />
      <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-300 dark:border-slate-700">
        <Link
          to="/glossary"
          className="text-sm underline hover:no-underline text-dark dark:text-light transition-opacity hover:opacity-80"
        >
          {t("documentation")}
        </Link>
      </div>
    </div>
  );
}
