import { useTranslation } from "react-i18next";
import { Header } from "../../components/Header";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { renderBrandText } from "../../components/shared/BrandText";
import { PrincipleCard } from "./PrincipleCard";
import { usePrinciples } from "./principles";
import { useSections } from "./sections";
import {
  SectionBlock,
  SectionParagraph,
  SectionItem,
  SectionList,
} from "./SectionBlock";
import type { Section } from "./sections";

const SectionRenderer = ({ section }: { section: Section }) => {
  switch (section.type) {
    case "governanceModel":
      return (
        <SectionBlock title={section.title} subtitle={section.subtitle}>
          <SectionParagraph>{section.intro}</SectionParagraph>
          <SectionItem
            title={section.multiRole.title}
            content={section.multiRole.content}
          />
        </SectionBlock>
      );

    case "roleTriad":
      return (
        <SectionBlock title={section.title} subtitle={section.subtitle}>
          <SectionParagraph>{section.intro}</SectionParagraph>
          <div className="flex flex-col gap-4">
            {section.roles.map((role, i) => (
              <SectionItem key={i} title={role.title} content={role.content} />
            ))}
          </div>
          <p className="text-sm opacity-60 leading-relaxed">
            {renderBrandText(section.footer)}
          </p>
        </SectionBlock>
      );

    case "consentDecisions":
      return (
        <SectionBlock title={section.title} subtitle={section.subtitle}>
          <SectionParagraph>{section.intro}</SectionParagraph>
          <div className="flex flex-col gap-4">
            {section.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-gold font-mono text-sm opacity-60 pt-0.5 select-none">
                  {i + 1}.
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-swarm text-lg font-semibold">
                    {step.title.toLowerCase()}
                  </h3>
                  <p className="text-base leading-relaxed">
                    {renderBrandText(step.content)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm opacity-60 leading-relaxed">
            {renderBrandText(section.footer)}
          </p>
        </SectionBlock>
      );

    case "teamConnections":
      return (
        <SectionBlock title={section.title} subtitle={section.subtitle}>
          <SectionParagraph>{section.content}</SectionParagraph>
        </SectionBlock>
      );

    case "communication":
      return (
        <SectionBlock title={section.title} subtitle={section.subtitle}>
          <SectionParagraph>{section.intro}</SectionParagraph>
          <SectionList items={section.items} />
        </SectionBlock>
      );

    case "topicsPoliciesTemplates":
      return (
        <SectionBlock title={section.title} subtitle={section.subtitle}>
          <div className="flex flex-col gap-4">
            {section.items.map((item, i) => (
              <SectionItem key={i} title={item.title} content={item.content} />
            ))}
          </div>
        </SectionBlock>
      );

    case "whatItIsNot":
      return (
        <SectionBlock title={section.title} subtitle={section.subtitle}>
          <div className="flex flex-col gap-4">
            {section.items.map((item, i) => (
              <SectionItem key={i} title={item.title} content={item.content} />
            ))}
          </div>
        </SectionBlock>
      );
  }
};

export const PrinciplesPage = () => {
  const { t } = useTranslation("legal");
  const principles = usePrinciples();
  const sections = useSections();

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

        {/* Core beliefs */}
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

        {/* Divider */}
        <hr className="border-gray-200 dark:border-gray-800" />

        {/* Extended sections */}
        <div className="flex flex-col gap-14">
          {sections.map((section, index) => (
            <SectionRenderer key={index} section={section} />
          ))}
        </div>
      </main>

      <LegalFooter />
    </>
  );
};
