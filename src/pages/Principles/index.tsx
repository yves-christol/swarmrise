import { useTranslation } from "react-i18next";
import { Header } from "../../components/Header";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { renderBrandText } from "../../components/shared/BrandText";
import { PrincipleCard } from "./PrincipleCard";
import { usePrinciples } from "./principles";

export const PrinciplesPage = () => {
  const { t } = useTranslation("legal");
  const principles = usePrinciples();

  return (
    <>
      <Header showBackButton />
      <main className="p-8 flex flex-col gap-16 max-w-3xl mx-auto">
        {/* Hero section */}
        <section className="flex flex-col items-center gap-6 text-center pt-8">
          <Logo size={64} begin={0} repeatCount={2} />
          <h1 className="font-swarm text-4xl font-bold">{t("principles.title")}</h1>
          <p className="text-lg max-w-xl opacity-80">
            {renderBrandText(t("principles.subtitle"))}
          </p>
        </section>

        {/* Principles list */}
        <section className="flex flex-col gap-8">
          {principles.map((principle, index) => (
            <PrincipleCard
              key={index}
              title={principle.title}
              content={principle.content}
              index={index}
            />
          ))}
        </section>
      </main>

      <LegalFooter />
    </>
  );
};
