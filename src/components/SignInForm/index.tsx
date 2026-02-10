import { SignInButton, SignUpButton } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";

export function SignInForm() {
  const { t } = useTranslation("auth");

  return (
    <div className="flex flex-col gap-6 w-96 mx-auto">
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        {t("earlyDevelopment")}
      </p>
      <div className="flex gap-4 justify-center">
        <SignInButton mode="modal">
          <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2">
            {t("signIn")}
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2">
            {t("signUp")}
          </button>
        </SignUpButton>
      </div>
    </div>
  );
}

