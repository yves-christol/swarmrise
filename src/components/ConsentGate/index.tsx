import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Trans, useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from "../../../convex/legal/versions";
import { Logo } from "../Logo";

type ConsentGateProps = {
  children: React.ReactNode;
};

export function ConsentGate({ children }: ConsentGateProps) {
  const user = useQuery(api.users.functions.getCurrentUser);

  // Loading state (undefined = query still resolving, null = webhook race)
  if (user === undefined || user === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  // User has accepted current versions -> render app
  const hasCurrentConsent =
    user.termsVersion === CURRENT_TERMS_VERSION &&
    user.privacyVersion === CURRENT_PRIVACY_VERSION;

  if (hasCurrentConsent) {
    return <>{children}</>;
  }

  // User needs to consent (first time or re-consent)
  const isUpdate = user.termsVersion !== undefined || user.privacyVersion !== undefined;

  return <ConsentScreen isUpdate={isUpdate} />;
}

function ConsentScreen({ isUpdate }: { isUpdate: boolean }) {
  const { t } = useTranslation("legal");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToAge, setAgreedToAge] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const acceptTerms = useMutation(api.users.functions.acceptTerms);

  const canSubmit = agreedToTerms && agreedToAge && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await acceptTerms();
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-md w-full flex flex-col items-center gap-6">
        <Logo size={64} />

        <h1 className="text-2xl font-bold text-dark dark:text-light text-center">
          {isUpdate ? t("consent.titleUpdated") : t("consent.title")}
        </h1>

        <p className="text-text-secondary text-center text-sm">
          {isUpdate ? t("consent.descriptionUpdated") : t("consent.description")}
        </p>

        <div className="w-full flex flex-col gap-4">
          {/* T&C + Privacy checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 w-5 h-5 min-w-5 accent-gold cursor-pointer"
            />
            <span className="text-sm text-dark dark:text-light select-none">
              <Trans
                i18nKey="consent.agreementText"
                ns="legal"
                components={{
                  termsLink: (
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    />
                  ),
                  privacyLink: (
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:underline"
                    />
                  ),
                }}
              />
            </span>
          </label>

          {/* Age checkbox */}
          <label className="flex items-start gap-3 cursor-pointer p-2 -m-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
            <input
              type="checkbox"
              checked={agreedToAge}
              onChange={(e) => setAgreedToAge(e.target.checked)}
              disabled={submitting}
              className="mt-0.5 w-5 h-5 min-w-5 accent-gold cursor-pointer"
            />
            <span className="text-sm text-dark dark:text-light select-none">
              {t("consent.ageConfirmation")}
            </span>
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full px-6 py-3 bg-highlight hover:bg-highlight-hover text-dark font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t("consent.submitting") : t("consent.continue")}
        </button>
      </div>
    </div>
  );
}
