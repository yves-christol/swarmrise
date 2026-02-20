import { useState } from "react";
import { Link } from "react-router";
import { useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import { Header } from "../../components/Header";
import { FloatingBackButton } from "../../components/FloatingLogo";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { useSelectedOrga } from "../../tools/orgaStore/hooks";

export const BugReportPage = () => {
  const { t } = useTranslation("bugReport");
  const { selectedOrgaId } = useSelectedOrga();
  const createBugReport = useMutation(api.bugReports.functions.create);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validate = () => {
    let valid = true;
    if (!title.trim()) {
      setTitleError(t("titleRequired"));
      valid = false;
    } else {
      setTitleError("");
    }
    if (!description.trim()) {
      setDescriptionError(t("descriptionRequired"));
      valid = false;
    } else {
      setDescriptionError("");
    }
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await createBugReport({
        title: title.trim(),
        description: description.trim(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        orgaId: selectedOrgaId ?? undefined,
      });
      setIsSubmitted(true);
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="swarmrise-page">
      <Header />
      <FloatingBackButton />
      <main className="p-8 flex flex-col gap-16 max-w-3xl mx-auto">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 text-center pt-8">
          <Logo size={64} begin={0} repeatCount={isSubmitted ? 3 : 2} />
          <h1 className="text-4xl font-bold">{t(isSubmitted ? "successTitle" : "title")}</h1>
          {!isSubmitted && (
            <p className="text-lg max-w-xl opacity-80 leading-relaxed">
              {t("subtitle")}
            </p>
          )}
        </section>

        {isSubmitted ? (
          <section className="flex flex-col items-center gap-6 text-center">
            <p className="text-text-description max-w-md leading-relaxed">
              {t("successMessage")}
            </p>
            <Link
              to="/welcome"
              className="px-6 py-3 bg-highlight hover:bg-highlight-hover text-dark font-bold rounded-lg transition-colors"
            >
              {t("backToHome")}
            </Link>
          </section>
        ) : (
          <section>
            <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-6">
              {/* Title */}
              <div className="flex flex-col gap-2">
                <label htmlFor="bug-title" className="text-sm font-bold text-dark dark:text-light">
                  {t("titleLabel")}
                </label>
                <input
                  id="bug-title"
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError("");
                  }}
                  placeholder={t("titlePlaceholder")}
                  className={`px-4 py-3 rounded-md border bg-surface-primary text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-highlight transition-colors ${
                    titleError ? "border-red-500 focus:ring-red-500" : "border-border-strong"
                  }`}
                  aria-invalid={!!titleError}
                  aria-describedby={titleError ? "title-error" : undefined}
                />
                {titleError && (
                  <p id="title-error" className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {titleError}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2">
                <label htmlFor="bug-description" className="text-sm font-bold text-dark dark:text-light">
                  {t("descriptionLabel")}
                </label>
                <textarea
                  id="bug-description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (descriptionError) setDescriptionError("");
                  }}
                  placeholder={t("descriptionPlaceholder")}
                  rows={6}
                  className={`px-4 py-3 rounded-md border bg-surface-primary text-dark dark:text-light focus:outline-none focus:ring-2 focus:ring-highlight transition-colors resize-y ${
                    descriptionError ? "border-red-500 focus:ring-red-500" : "border-border-strong"
                  }`}
                  aria-invalid={!!descriptionError}
                  aria-describedby="description-hint"
                />
                <p id="description-hint" className="text-xs text-gray-400">
                  {t("descriptionHint")}
                </p>
                {descriptionError && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {descriptionError}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-highlight hover:bg-highlight-hover text-dark font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t("submittingButton") : t("submitButton")}
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      <LegalFooter />
    </div>
  );
};
