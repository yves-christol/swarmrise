import { Header } from "../../components/Header";
import { FloatingBackButton } from "../../components/FloatingLogo";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { renderBrandText } from "../../components/shared/BrandText";
import { useTranslation } from "react-i18next";

export const TermsPage = () => {
  const { t } = useTranslation("legal");
  const effectiveDate = "February 1, 2026";
  const lastUpdated = "February 19, 2026";

  return (
    <div className="swarmrise-page">
      <Header />
      <FloatingBackButton />
      <main className="p-8 flex flex-col gap-12 max-w-3xl mx-auto">
        {/* Hero section */}
        <section className="flex flex-col items-center gap-6 text-center pt-8">
          <Logo size={64} begin={0} repeatCount={2} />
          <h1 className="text-4xl font-bold">{t("terms.title")}</h1>
          <p className="text-sm opacity-70">
            {t("terms.effectiveDateLabel")}: {effectiveDate} | {t("terms.lastUpdatedLabel")}: {lastUpdated}
          </p>
        </section>

        {/* Introduction */}
        <section className="flex flex-col gap-4">
          <p className="text-base leading-relaxed ">
            {renderBrandText(t("terms.intro.welcome"))}
          </p>
          <p className="text-base leading-relaxed ">
            {t("terms.intro.readCarefully")}
          </p>
        </section>

        {/* Terms sections */}
        <div className="flex flex-col gap-10">
          <TermsSection number={1} title={t("terms.sections.acceptanceOfTerms.title")}>
            <p>{t("terms.sections.acceptanceOfTerms.p1")}</p>
            <p>{t("terms.sections.acceptanceOfTerms.p2")}</p>
          </TermsSection>

          <TermsSection number={2} title={t("terms.sections.descriptionOfService.title")}>
            <p>{renderBrandText(t("terms.sections.descriptionOfService.intro"))}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.descriptionOfService.features.structureTeams")}</li>
              <li>{t("terms.sections.descriptionOfService.features.createRoles")}</li>
              <li>{t("terms.sections.descriptionOfService.features.trackDecisions")}</li>
              <li>{t("terms.sections.descriptionOfService.features.manageMembers")}</li>
              <li>{t("terms.sections.descriptionOfService.features.establishPolicies")}</li>
            </ul>
            <p>{t("terms.sections.descriptionOfService.reserveRight")}</p>
          </TermsSection>

          <TermsSection number={3} title={t("terms.sections.accountRegistration.title")}>
            <p>{t("terms.sections.accountRegistration.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.accountRegistration.requirements.provideAccurate")}</li>
              <li>{t("terms.sections.accountRegistration.requirements.maintainInfo")}</li>
              <li>{t("terms.sections.accountRegistration.requirements.keepSecure")}</li>
              <li>{t("terms.sections.accountRegistration.requirements.notifyUnauthorized")}</li>
              <li>{t("terms.sections.accountRegistration.requirements.acceptResponsibility")}</li>
            </ul>
            <p>{t("terms.sections.accountRegistration.clerkNote")}</p>
          </TermsSection>

          <TermsSection number={4} title={t("terms.sections.organizationsAndMembership.title")}>
            <p>{t("terms.sections.organizationsAndMembership.ownerIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.organizationsAndMembership.ownerResponsibilities.manageSettings")}</li>
              <li>{t("terms.sections.organizationsAndMembership.ownerResponsibilities.ensureCompliance")}</li>
              <li>{t("terms.sections.organizationsAndMembership.ownerResponsibilities.contentActivities")}</li>
              <li>{t("terms.sections.organizationsAndMembership.ownerResponsibilities.handleInvitations")}</li>
            </ul>
            <p>{t("terms.sections.organizationsAndMembership.memberIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.organizationsAndMembership.memberResponsibilities.respectGovernance")}</li>
              <li>{t("terms.sections.organizationsAndMembership.memberResponsibilities.useAccordingly")}</li>
              <li>{t("terms.sections.organizationsAndMembership.memberResponsibilities.noCircumvent")}</li>
            </ul>
          </TermsSection>

          <TermsSection number={5} title={t("terms.sections.acceptableUse.title")}>
            <p>{t("terms.sections.acceptableUse.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.acceptableUse.prohibitions.violateLaws")}</li>
              <li>{t("terms.sections.acceptableUse.prohibitions.harassOthers")}</li>
              <li>{t("terms.sections.acceptableUse.prohibitions.uploadMalicious")}</li>
              <li>{t("terms.sections.acceptableUse.prohibitions.unauthorizedAccess")}</li>
              <li>{t("terms.sections.acceptableUse.prohibitions.interfereService")}</li>
              <li>{t("terms.sections.acceptableUse.prohibitions.scrapeService")}</li>
              <li>{t("terms.sections.acceptableUse.prohibitions.impersonate")}</li>
              <li>{t("terms.sections.acceptableUse.prohibitions.fraudulent")}</li>
              <li>{t("terms.sections.acceptableUse.prohibitions.circumventSecurity")}</li>
            </ul>
          </TermsSection>

          <TermsSection number={6} title={t("terms.sections.userContent.title")}>
            <p>{t("terms.sections.userContent.ownership")}</p>
            <p>{t("terms.sections.userContent.warrantyIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.userContent.warranties.ownRights")}</li>
              <li>{t("terms.sections.userContent.warranties.noViolation")}</li>
              <li>{t("terms.sections.userContent.warranties.compliesTerms")}</li>
            </ul>
          </TermsSection>

          <TermsSection number={7} title={t("terms.sections.intellectualProperty.title")}>
            <p>{t("terms.sections.intellectualProperty.license")}</p>
            <p>{renderBrandText(t("terms.sections.intellectualProperty.brandElements"))}</p>
            <p>{t("terms.sections.intellectualProperty.thirdParty")}</p>
          </TermsSection>

          <TermsSection number={8} title={t("terms.sections.dataProtection.title")}>
            <p>{t("terms.sections.dataProtection.commitment")}</p>
            <p>{t("terms.sections.dataProtection.keyAspectsIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.dataProtection.keyAspects.collectNecessary")}</li>
              <li>{t("terms.sections.dataProtection.keyAspects.dataIsolated")}</li>
              <li>{t("terms.sections.dataProtection.keyAspects.convexStorage")}</li>
              <li>{t("terms.sections.dataProtection.keyAspects.clerkAuth")}</li>
              <li>{t("terms.sections.dataProtection.keyAspects.auditTrails")}</li>
            </ul>
            <p>{t("terms.sections.dataProtection.gdprNote")}</p>
          </TermsSection>

          <TermsSection number={9} title={t("terms.sections.serviceAvailability.title")}>
            <p>{t("terms.sections.serviceAvailability.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.serviceAvailability.reasons.maintenance")}</li>
              <li>{t("terms.sections.serviceAvailability.reasons.outages")}</li>
              <li>{t("terms.sections.serviceAvailability.reasons.beyondControl")}</li>
            </ul>
            <p>{t("terms.sections.serviceAvailability.asIs")}</p>
          </TermsSection>

          <TermsSection number={10} title={t("terms.sections.limitationOfLiability.title")}>
            <p>{t("terms.sections.limitationOfLiability.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.limitationOfLiability.damages.lostProfits")}</li>
              <li>{t("terms.sections.limitationOfLiability.damages.interruptions")}</li>
              <li>{t("terms.sections.limitationOfLiability.damages.unauthorizedAccess")}</li>
              <li>{t("terms.sections.limitationOfLiability.damages.thirdPartyConduct")}</li>
            </ul>
            <p>{t("terms.sections.limitationOfLiability.totalLiability")}</p>
          </TermsSection>

          <TermsSection number={11} title={t("terms.sections.indemnification.title")}>
            <p>{renderBrandText(t("terms.sections.indemnification.intro"))}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.indemnification.items.accessUse")}</li>
              <li>{t("terms.sections.indemnification.items.violationTerms")}</li>
              <li>{t("terms.sections.indemnification.items.userContent")}</li>
              <li>{t("terms.sections.indemnification.items.violationRights")}</li>
            </ul>
          </TermsSection>

          <TermsSection number={12} title={t("terms.sections.termination.title")}>
            <p>{t("terms.sections.termination.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("terms.sections.termination.reasons.breachTerms")}</li>
              <li>{t("terms.sections.termination.reasons.requiredByLaw")}</li>
              <li>{t("terms.sections.termination.reasons.discontinueService")}</li>
            </ul>
            <p>{t("terms.sections.termination.uponTermination")}</p>
          </TermsSection>

          <TermsSection number={13} title={t("terms.sections.disputeResolution.title")}>
            <p>{t("terms.sections.disputeResolution.informal")}</p>
            <p>{t("terms.sections.disputeResolution.euNote")}</p>
          </TermsSection>

          <TermsSection number={14} title={t("terms.sections.governingLaw.title")}>
            <p>{t("terms.sections.governingLaw.law")}</p>
            <p>{t("terms.sections.governingLaw.eeaNote")}</p>
          </TermsSection>

          <TermsSection number={15} title={t("terms.sections.generalProvisions.title")}>
            <p>
              <strong>{t("terms.sections.generalProvisions.entireAgreement")}</strong> {renderBrandText(t("terms.sections.generalProvisions.entireAgreementText"))}
            </p>
            <p>
              <strong>{t("terms.sections.generalProvisions.severability")}</strong> {t("terms.sections.generalProvisions.severabilityText")}
            </p>
            <p>
              <strong>{t("terms.sections.generalProvisions.waiver")}</strong> {t("terms.sections.generalProvisions.waiverText")}
            </p>
            <p>
              <strong>{t("terms.sections.generalProvisions.assignment")}</strong> {t("terms.sections.generalProvisions.assignmentText")}
            </p>
          </TermsSection>

          <TermsSection number={16} title={t("terms.sections.contactInformation.title")}>
            <p>{t("terms.sections.contactInformation.intro")}</p>
            <ul className="list-none space-y-2">
              <li><strong>{t("terms.sections.contactInformation.publisher")}</strong>{" "}
                {t("terms.sections.contactInformation.publisherText")}
              </li>
              <li><strong>{t("terms.sections.contactInformation.github")}</strong>{" "}
                <a
                  href="https://github.com/yves-christol/swarmrise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  github.com/yves-christol/swarmrise
                </a>
              </li>
            </ul>
          </TermsSection>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
};

type TermsSectionProps = {
  number: number;
  title: string;
  children: React.ReactNode;
};

const TermsSection = ({ number, title, children }: TermsSectionProps) => {
  return (
    <article className="flex flex-col gap-4 terms-section">
      <div className="flex items-baseline gap-3">
        <span className="text-xs opacity-50 font-mono w-6">
          {String(number).padStart(2, "0")}
        </span>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      <div className="pl-9 space-y-4 text-base leading-relaxed ">
        {children}
      </div>
    </article>
  );
};
