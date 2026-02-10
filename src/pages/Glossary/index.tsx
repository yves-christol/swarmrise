import { useTranslation } from "react-i18next";
import { Header } from "../../components/Header";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { renderBrandText } from "../../components/shared/BrandText";
import { GlossaryCard } from "./GlossaryCard";
import { useGlossary } from "./glossary";

export const GlossaryPage = () => {
  const { t } = useTranslation("glossary");
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
            {renderBrandText(t("subtitle"))}
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
      </main>

      <LegalFooter />
    </>
  );
};
