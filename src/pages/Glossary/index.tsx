import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Header } from "../../components/Header";
import { Logo } from "../../components/Logo";
import { GlossaryCard } from "./GlossaryCard";
import { useGlossary } from "./glossary";

export const GlossaryPage = () => {
  const { t } = useTranslation("glossary");
  const { t: tLegal } = useTranslation("legal");
  const glossary = useGlossary();

  return (
    <>
      <Header showBackButton />
      <main className="p-8 flex flex-col gap-16 max-w-3xl mx-auto">
        {/* Hero section */}
        <section className="flex flex-col items-center gap-6 text-center pt-8">
          <Logo size={64} begin={0} repeatCount={2} />
          <h1 className="font-swarm text-4xl font-bold">{t("title")}</h1>
          <p className="text-lg max-w-xl opacity-80">
            {t("subtitle")}
          </p>
        </section>

        {/* Glossary list */}
        <section className="flex flex-col gap-8">
          {glossary.map((entry, index) => (
            <GlossaryCard
              key={index}
              title={entry.title}
              description={entry.description}
              example={entry.example}
              index={index}
            />
          ))}
        </section>

        {/* Related documents */}
        <section className="border-t border-gray-300 dark:border-gray-700 pt-8">
          <h2 className="font-swarm text-xl font-bold mb-4">{t("relatedDocuments")}</h2>
          <ul className="space-y-2">
            <li>
              <Link to="/principles" className="text-gold hover:underline">
                {t("principlesLink")}
              </Link>
              {" "}- {t("principlesDescription")}
            </li>
            <li>
              <Link to="/terms" className="text-gold hover:underline">
                {tLegal("terms.title")}
              </Link>
              {" "}- {tLegal("principles.termsDescription")}
            </li>
          </ul>
        </section>

        {/* Footer */}
        <section className="text-center py-8 border-t border-gray-300 dark:border-gray-700">
          <p className="text-sm opacity-70">
            {t("footer")}
          </p>
        </section>
      </main>
    </>
  );
};
