import { Header } from "../../components/Header";
import { FloatingBackButton } from "../../components/FloatingLogo";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { renderBrandText } from "../../components/shared/BrandText";
import { useTranslation } from "react-i18next";

export const PrivacyPage = () => {
  const { t } = useTranslation("legal");
  const effectiveDate = "February 1, 2026";
  const lastUpdated = "February 1, 2026";

  return (
    <div className="swarmrise-page">
      <Header />
      <FloatingBackButton />
      <main className="p-8 flex flex-col gap-12 max-w-3xl mx-auto">
        {/* Hero section */}
        <section className="flex flex-col items-center gap-6 text-center pt-8">
          <Logo size={64} begin={0} repeatCount={2} />
          <h1 className="text-4xl font-bold">{t("privacy.title")}</h1>
          <p className="text-sm opacity-70">
            {t("privacy.effectiveDateLabel")}: {effectiveDate} | {t("privacy.lastUpdatedLabel")}: {lastUpdated}
          </p>
        </section>

        {/* Introduction */}
        <section className="flex flex-col gap-4">
          <p className="text-base leading-relaxed ">
            {renderBrandText(t("privacy.intro.commitment"))}
          </p>
          <p className="text-base leading-relaxed ">
            {t("privacy.intro.gdprCompliance")}
          </p>
        </section>

        {/* Privacy sections */}
        <div className="flex flex-col gap-10">
          <PrivacySection number={1} title={t("privacy.sections.dataController.title")}>
            <p>{renderBrandText(t("privacy.sections.dataController.p1"))}</p>
            <p>{t("privacy.sections.dataController.p2")}</p>
          </PrivacySection>

          <PrivacySection number={2} title={t("privacy.sections.informationWeCollect.title")}>
            <p>{t("privacy.sections.informationWeCollect.intro")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.informationWeCollect.accountInfo.title")}
            </h3>
            <p>{t("privacy.sections.informationWeCollect.accountInfo.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.informationWeCollect.accountInfo.items.name")}</li>
              <li>{t("privacy.sections.informationWeCollect.accountInfo.items.email")}</li>
              <li>{t("privacy.sections.informationWeCollect.accountInfo.items.profilePicture")}</li>
            </ul>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.informationWeCollect.organizationData.title")}
            </h3>
            <p>{t("privacy.sections.informationWeCollect.organizationData.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.informationWeCollect.organizationData.items.orgNames")}</li>
              <li>{t("privacy.sections.informationWeCollect.organizationData.items.teamStructures")}</li>
              <li>{t("privacy.sections.informationWeCollect.organizationData.items.roleAssignments")}</li>
              <li>{t("privacy.sections.informationWeCollect.organizationData.items.membershipInfo")}</li>
              <li>{t("privacy.sections.informationWeCollect.organizationData.items.invitationData")}</li>
            </ul>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.informationWeCollect.optionalContact.title")}
            </h3>
            <p>{t("privacy.sections.informationWeCollect.optionalContact.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.informationWeCollect.optionalContact.items.mobile")}</li>
              <li>{t("privacy.sections.informationWeCollect.optionalContact.items.address")}</li>
              <li>{t("privacy.sections.informationWeCollect.optionalContact.items.socialMedia")}</li>
            </ul>
            <p>{t("privacy.sections.informationWeCollect.optionalContact.note")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.informationWeCollect.usageData.title")}
            </h3>
            <p>{t("privacy.sections.informationWeCollect.usageData.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.informationWeCollect.usageData.items.browser")}</li>
              <li>{t("privacy.sections.informationWeCollect.usageData.items.device")}</li>
              <li>{t("privacy.sections.informationWeCollect.usageData.items.ipAddress")}</li>
              <li>{t("privacy.sections.informationWeCollect.usageData.items.pagesVisited")}</li>
              <li>{t("privacy.sections.informationWeCollect.usageData.items.dateTime")}</li>
            </ul>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.informationWeCollect.decisionAudit.title")}
            </h3>
            <p>{t("privacy.sections.informationWeCollect.decisionAudit.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.informationWeCollect.decisionAudit.items.authorEmail")}</li>
              <li>{t("privacy.sections.informationWeCollect.decisionAudit.items.timestamps")}</li>
              <li>{t("privacy.sections.informationWeCollect.decisionAudit.items.beforeAfter")}</li>
            </ul>
          </PrivacySection>

          <PrivacySection number={3} title={t("privacy.sections.howWeUse.title")}>
            <p>{t("privacy.sections.howWeUse.intro")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.howWeUse.serviceProvision.title")}
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.howWeUse.serviceProvision.items.createAccount")}</li>
              <li>{t("privacy.sections.howWeUse.serviceProvision.items.provideAccess")}</li>
              <li>{t("privacy.sections.howWeUse.serviceProvision.items.processMembers")}</li>
              <li>{t("privacy.sections.howWeUse.serviceProvision.items.enableTeamMgmt")}</li>
              <li>{t("privacy.sections.howWeUse.serviceProvision.items.authenticate")}</li>
            </ul>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.howWeUse.legitimateInterests.title")}
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.howWeUse.legitimateInterests.items.auditTrails")}</li>
              <li>{t("privacy.sections.howWeUse.legitimateInterests.items.improveService")}</li>
              <li>{t("privacy.sections.howWeUse.legitimateInterests.items.preventFraud")}</li>
              <li>{t("privacy.sections.howWeUse.legitimateInterests.items.respondSupport")}</li>
            </ul>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.howWeUse.consent.title")}
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.howWeUse.consent.items.storeOptional")}</li>
              <li>{t("privacy.sections.howWeUse.consent.items.displayProfile")}</li>
            </ul>
            <p>{t("privacy.sections.howWeUse.consent.withdrawNote")}</p>
          </PrivacySection>

          <PrivacySection number={4} title={t("privacy.sections.thirdPartyServices.title")}>
            <p>{t("privacy.sections.thirdPartyServices.intro")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.thirdPartyServices.clerk.title")}
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.clerk.purpose")}</strong> {t("privacy.sections.thirdPartyServices.clerk.purposeText")}
              </li>
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.clerk.dataProcessed")}</strong> {t("privacy.sections.thirdPartyServices.clerk.dataProcessedText")}
              </li>
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.clerk.location")}</strong> {t("privacy.sections.thirdPartyServices.clerk.locationText")}
              </li>
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.clerk.privacyPolicy")}</strong>{" "}
                <a
                  href="https://clerk.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  clerk.com/legal/privacy
                </a>
              </li>
            </ul>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.thirdPartyServices.convex.title")}
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.convex.purpose")}</strong> {t("privacy.sections.thirdPartyServices.convex.purposeText")}
              </li>
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.convex.dataProcessed")}</strong> {t("privacy.sections.thirdPartyServices.convex.dataProcessedText")}
              </li>
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.convex.location")}</strong> {t("privacy.sections.thirdPartyServices.convex.locationText")}
              </li>
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.convex.privacyPolicy")}</strong>{" "}
                <a
                  href="https://www.convex.dev/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  convex.dev/legal/privacy
                </a>
              </li>
            </ul>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.thirdPartyServices.googleFonts.title")}
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.googleFonts.purpose")}</strong> {t("privacy.sections.thirdPartyServices.googleFonts.purposeText")}
              </li>
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.googleFonts.dataProcessed")}</strong> {t("privacy.sections.thirdPartyServices.googleFonts.dataProcessedText")}
              </li>
              <li>
                <strong>{t("privacy.sections.thirdPartyServices.googleFonts.privacyPolicy")}</strong>{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold hover:underline"
                >
                  policies.google.com/privacy
                </a>
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection number={5} title={t("privacy.sections.dataRetention.title")}>
            <p>{t("privacy.sections.dataRetention.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{t("privacy.sections.dataRetention.items.accountData")}</strong> {t("privacy.sections.dataRetention.items.accountDataText")}
              </li>
              <li>
                <strong>{t("privacy.sections.dataRetention.items.orgData")}</strong> {t("privacy.sections.dataRetention.items.orgDataText")}
              </li>
              <li>
                <strong>{t("privacy.sections.dataRetention.items.invitationData")}</strong> {t("privacy.sections.dataRetention.items.invitationDataText")}
              </li>
              <li>
                <strong>{t("privacy.sections.dataRetention.items.auditTrails")}</strong> {t("privacy.sections.dataRetention.items.auditTrailsText")}
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection number={6} title={t("privacy.sections.yourRightsGdpr.title")}>
            <p>{t("privacy.sections.yourRightsGdpr.intro")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.yourRightsGdpr.rightOfAccess.title")}
            </h3>
            <p>{t("privacy.sections.yourRightsGdpr.rightOfAccess.text")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.yourRightsGdpr.rightToRectification.title")}
            </h3>
            <p>{t("privacy.sections.yourRightsGdpr.rightToRectification.text")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.yourRightsGdpr.rightToErasure.title")}
            </h3>
            <p>{t("privacy.sections.yourRightsGdpr.rightToErasure.text")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.yourRightsGdpr.rightToRestriction.title")}
            </h3>
            <p>{t("privacy.sections.yourRightsGdpr.rightToRestriction.text")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.yourRightsGdpr.rightToPortability.title")}
            </h3>
            <p>{t("privacy.sections.yourRightsGdpr.rightToPortability.text")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.yourRightsGdpr.rightToObject.title")}
            </h3>
            <p>{t("privacy.sections.yourRightsGdpr.rightToObject.text")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.yourRightsGdpr.rightToWithdraw.title")}
            </h3>
            <p>{t("privacy.sections.yourRightsGdpr.rightToWithdraw.text")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.yourRightsGdpr.rightToComplaint.title")}
            </h3>
            <p>{t("privacy.sections.yourRightsGdpr.rightToComplaint.text")}</p>

            <p className="mt-4">{t("privacy.sections.yourRightsGdpr.exerciseRights")}</p>
          </PrivacySection>

          <PrivacySection number={7} title={t("privacy.sections.cookiesLocalStorage.title")}>
            <p>{t("privacy.sections.cookiesLocalStorage.intro")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.cookiesLocalStorage.localStorage.title")}
            </h3>
            <table className="w-full text-sm mt-2 border-collapse">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="text-left py-2">{t("privacy.sections.cookiesLocalStorage.localStorage.tableHeaders.storageKey")}</th>
                  <th className="text-left py-2">{t("privacy.sections.cookiesLocalStorage.localStorage.tableHeaders.purpose")}</th>
                  <th className="text-left py-2">{t("privacy.sections.cookiesLocalStorage.localStorage.tableHeaders.duration")}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 font-mono text-xs">{t("privacy.sections.cookiesLocalStorage.localStorage.items.locale.key")}</td>
                  <td className="py-2">{t("privacy.sections.cookiesLocalStorage.localStorage.items.locale.purpose")}</td>
                  <td className="py-2">{t("privacy.sections.cookiesLocalStorage.localStorage.items.locale.duration")}</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 font-mono text-xs">{t("privacy.sections.cookiesLocalStorage.localStorage.items.selectedOrga.key")}</td>
                  <td className="py-2">{t("privacy.sections.cookiesLocalStorage.localStorage.items.selectedOrga.purpose")}</td>
                  <td className="py-2">{t("privacy.sections.cookiesLocalStorage.localStorage.items.selectedOrga.duration")}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.cookiesLocalStorage.authCookies.title")}
            </h3>
            <p>{t("privacy.sections.cookiesLocalStorage.authCookies.text")}</p>

            <h3 className="font-semibold  mt-4">
              {t("privacy.sections.cookiesLocalStorage.noTracking.title")}
            </h3>
            <p>{t("privacy.sections.cookiesLocalStorage.noTracking.text")}</p>
          </PrivacySection>

          <PrivacySection number={8} title={t("privacy.sections.dataSecurity.title")}>
            <p>{t("privacy.sections.dataSecurity.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>{t("privacy.sections.dataSecurity.measures.encryption")}</strong> {t("privacy.sections.dataSecurity.measures.encryptionText")}
              </li>
              <li>
                <strong>{t("privacy.sections.dataSecurity.measures.secureAuth")}</strong> {t("privacy.sections.dataSecurity.measures.secureAuthText")}
              </li>
              <li>
                <strong>{t("privacy.sections.dataSecurity.measures.multiTenant")}</strong> {t("privacy.sections.dataSecurity.measures.multiTenantText")}
              </li>
              <li>
                <strong>{t("privacy.sections.dataSecurity.measures.accessControls")}</strong> {t("privacy.sections.dataSecurity.measures.accessControlsText")}
              </li>
              <li>
                <strong>{t("privacy.sections.dataSecurity.measures.securityReviews")}</strong> {t("privacy.sections.dataSecurity.measures.securityReviewsText")}
              </li>
            </ul>
            <p>{t("privacy.sections.dataSecurity.disclaimer")}</p>
          </PrivacySection>

          <PrivacySection number={9} title={t("privacy.sections.internationalTransfers.title")}>
            <p>{t("privacy.sections.internationalTransfers.intro")}</p>
            <p>{t("privacy.sections.internationalTransfers.safeguardsIntro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.internationalTransfers.safeguards.sccs")}</li>
              <li>{t("privacy.sections.internationalTransfers.safeguards.dpas")}</li>
              <li>{t("privacy.sections.internationalTransfers.safeguards.supplementary")}</li>
            </ul>
            <p>{t("privacy.sections.internationalTransfers.requestCopy")}</p>
          </PrivacySection>

          <PrivacySection number={10} title={t("privacy.sections.childrensPrivacy.title")}>
            <p>{t("privacy.sections.childrensPrivacy.p1")}</p>
            <p>{t("privacy.sections.childrensPrivacy.p2")}</p>
          </PrivacySection>

          <PrivacySection number={11} title={t("privacy.sections.changesToPolicy.title")}>
            <p>{t("privacy.sections.changesToPolicy.intro")}</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>{t("privacy.sections.changesToPolicy.items.updateDate")}</li>
              <li>{t("privacy.sections.changesToPolicy.items.notifyEmail")}</li>
              <li>{t("privacy.sections.changesToPolicy.items.renewConsent")}</li>
            </ul>
            <p>{t("privacy.sections.changesToPolicy.reviewPeriodically")}</p>
          </PrivacySection>

          <PrivacySection number={12} title={t("privacy.sections.contactInformation.title")}>
            <p>{t("privacy.sections.contactInformation.intro")}</p>
            <ul className="list-none space-y-2">
              <li>
                <strong>{t("privacy.sections.contactInformation.github")}</strong>{" "}
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
            <p className="mt-4">{t("privacy.sections.contactInformation.responseTime")}</p>
          </PrivacySection>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
};

type PrivacySectionProps = {
  number: number;
  title: string;
  children: React.ReactNode;
};

const PrivacySection = ({ number, title, children }: PrivacySectionProps) => {
  return (
    <article className="flex flex-col gap-4 privacy-section">
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
