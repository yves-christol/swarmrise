import { Header } from "../../components/Header";
import { Logo } from "../../components/Logo";
import { Link } from "react-router";

export const PrivacyPage = () => {
  const effectiveDate = "February 1, 2026";
  const lastUpdated = "February 1, 2026";

  return (
    <>
      <Header showBackButton />
      <main className="p-8 flex flex-col gap-12 max-w-3xl mx-auto">
        {/* Hero section */}
        <section className="flex flex-col items-center gap-6 text-center pt-8">
          <Logo size={64} begin={0} repeatCount={2} />
          <h1 className="font-swarm text-4xl font-bold">privacy policy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Effective Date: {effectiveDate} | Last Updated: {lastUpdated}
          </p>
        </section>

        {/* Introduction */}
        <section className="flex flex-col gap-4">
          <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
            At <span className="font-swarm text-[#eac840]">swarmrise</span>, we
            are committed to protecting your privacy and personal data. This
            Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you use our multi-tenant organization
            management platform (the "Service").
          </p>
          <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
            We process personal data in compliance with the General Data
            Protection Regulation (GDPR) and other applicable data protection
            laws. Please read this Privacy Policy carefully to understand our
            practices regarding your personal data.
          </p>
        </section>

        {/* Privacy sections */}
        <div className="flex flex-col gap-10">
          <PrivacySection number={1} title="data controller">
            <p>
              For the purposes of GDPR and other applicable data protection
              laws, Swarmrise acts as the data controller for personal data
              collected through the Service. This means we determine the
              purposes and means of processing your personal data.
            </p>
            <p>
              If you have questions about our data practices or wish to exercise
              your rights, please contact us through the channels listed in the
              Contact Information section below.
            </p>
          </PrivacySection>

          <PrivacySection number={2} title="information we collect">
            <p>
              We collect information that you provide directly to us, as well as
              information collected automatically when you use the Service.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              2.1 Account Information
            </h3>
            <p>When you create an account, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>First name and surname</li>
              <li>Email address</li>
              <li>
                Profile picture (optional, if provided through authentication)
              </li>
            </ul>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              2.2 Organization Data
            </h3>
            <p>
              When you create or join organizations, we collect and process:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Organization names and settings</li>
              <li>Team structures and hierarchies</li>
              <li>Role assignments (leader, secretary, referee)</li>
              <li>Membership information</li>
              <li>Invitation data (email addresses of invitees)</li>
            </ul>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              2.3 Optional Contact Information
            </h3>
            <p>
              You may choose to provide additional contact information,
              including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mobile phone number</li>
              <li>Physical address</li>
              <li>
                Social media profiles (LinkedIn, Facebook, Instagram, WhatsApp)
              </li>
            </ul>
            <p>
              This information is entirely optional and collected only with your
              explicit consent.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              2.4 Usage Data
            </h3>
            <p>We automatically collect certain information when you use the Service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Browser type and version</li>
              <li>Device information</li>
              <li>IP address</li>
              <li>Pages visited and features used</li>
              <li>Date and time of access</li>
            </ul>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              2.5 Decision Audit Trail
            </h3>
            <p>
              To ensure transparency and accountability, we maintain audit
              trails of significant actions within organizations, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Author email for changes made</li>
              <li>Timestamps of actions</li>
              <li>Before and after states of modified data</li>
            </ul>
          </PrivacySection>

          <PrivacySection number={3} title="how we use your information">
            <p>
              We use the information we collect for the following purposes, each
              with a specific legal basis under GDPR:
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              3.1 Service Provision (Contract - Article 6(1)(b))
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Create and manage your user account</li>
              <li>Provide access to organization management features</li>
              <li>Process organization memberships and invitations</li>
              <li>Enable team and role management functionality</li>
              <li>Authenticate your identity</li>
            </ul>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              3.2 Legitimate Interests (Article 6(1)(f))
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain decision audit trails for accountability</li>
              <li>Improve and optimize the Service</li>
              <li>Prevent fraud and ensure security</li>
              <li>Respond to support requests</li>
            </ul>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              3.3 Consent (Article 6(1)(a))
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Store optional contact information you choose to provide</li>
              <li>Display your profile picture</li>
            </ul>
            <p>
              You may withdraw consent at any time by updating your profile
              settings or contacting us.
            </p>
          </PrivacySection>

          <PrivacySection number={4} title="third-party services">
            <p>
              We use the following third-party services to operate the Service.
              Each of these services processes your data on our behalf:
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              4.1 Clerk (Authentication)
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Purpose:</strong> User authentication and identity
                management
              </li>
              <li>
                <strong>Data processed:</strong> Email, name, profile picture,
                authentication credentials
              </li>
              <li>
                <strong>Location:</strong> United States
              </li>
              <li>
                <strong>Privacy policy:</strong>{" "}
                <a
                  href="https://clerk.com/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#eac840] hover:underline"
                >
                  clerk.com/legal/privacy
                </a>
              </li>
            </ul>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              4.2 Convex (Database and Backend)
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Purpose:</strong> Real-time database storage and
                serverless backend functions
              </li>
              <li>
                <strong>Data processed:</strong> All application data including
                user profiles, organization data, and audit trails
              </li>
              <li>
                <strong>Location:</strong> United States
              </li>
              <li>
                <strong>Privacy policy:</strong>{" "}
                <a
                  href="https://www.convex.dev/legal/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#eac840] hover:underline"
                >
                  convex.dev/legal/privacy
                </a>
              </li>
            </ul>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              4.3 Google Fonts
            </h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Purpose:</strong> Font delivery (Montserrat Alternates)
              </li>
              <li>
                <strong>Data processed:</strong> IP address (minimal)
              </li>
              <li>
                <strong>Privacy policy:</strong>{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#eac840] hover:underline"
                >
                  policies.google.com/privacy
                </a>
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection number={5} title="data retention">
            <p>
              We retain your personal data only for as long as necessary to
              fulfill the purposes for which it was collected:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Account data:</strong> Retained for the lifetime of your
                account. When you delete your account, we will delete your
                personal data within 30 days, except where retention is required
                by law.
              </li>
              <li>
                <strong>Organization data:</strong> Retained for the duration of
                your membership in an organization. When you leave an
                organization, your member record is removed, though audit
                records may be retained for accountability purposes.
              </li>
              <li>
                <strong>Invitation data:</strong> Retained until the invitation
                is accepted, rejected, or expires.
              </li>
              <li>
                <strong>Audit trails:</strong> Retained for the lifetime of the
                organization for accountability and compliance purposes.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection number={6} title="your rights under gdpr">
            <p>
              If you are located in the European Economic Area (EEA), United
              Kingdom, or Switzerland, you have the following rights regarding
              your personal data:
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              6.1 Right of Access (Article 15)
            </h3>
            <p>
              You have the right to obtain confirmation of whether we process
              your personal data and to receive a copy of that data.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              6.2 Right to Rectification (Article 16)
            </h3>
            <p>
              You have the right to correct inaccurate personal data and to have
              incomplete data completed. You can update most of your information
              directly through your account settings.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              6.3 Right to Erasure (Article 17)
            </h3>
            <p>
              You have the right to request deletion of your personal data under
              certain circumstances, including when the data is no longer
              necessary for the purposes for which it was collected.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              6.4 Right to Restriction (Article 18)
            </h3>
            <p>
              You have the right to request restriction of processing of your
              personal data under certain circumstances.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              6.5 Right to Data Portability (Article 20)
            </h3>
            <p>
              You have the right to receive your personal data in a structured,
              commonly used, machine-readable format and to transmit it to
              another controller.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              6.6 Right to Object (Article 21)
            </h3>
            <p>
              You have the right to object to processing of your personal data
              based on legitimate interests, including profiling.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              6.7 Right to Withdraw Consent
            </h3>
            <p>
              Where processing is based on consent, you have the right to
              withdraw consent at any time without affecting the lawfulness of
              processing based on consent before its withdrawal.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              6.8 Right to Lodge a Complaint
            </h3>
            <p>
              You have the right to lodge a complaint with a supervisory
              authority if you believe our processing of your personal data
              violates applicable data protection laws.
            </p>

            <p className="mt-4">
              To exercise any of these rights, please contact us using the
              information in the Contact section below. We will respond to your
              request within 30 days.
            </p>
          </PrivacySection>

          <PrivacySection number={7} title="cookies and local storage">
            <p>
              We use browser storage technologies to provide and improve the
              Service. Our use is limited to strictly necessary functionality:
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              7.1 Local Storage
            </h3>
            <table className="w-full text-sm mt-2 border-collapse">
              <thead>
                <tr className="border-b border-gray-300 dark:border-gray-600">
                  <th className="text-left py-2">Storage Key</th>
                  <th className="text-left py-2">Purpose</th>
                  <th className="text-left py-2">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 font-mono text-xs">swarmrise_locale</td>
                  <td className="py-2">Language preference</td>
                  <td className="py-2">Persistent</td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <td className="py-2 font-mono text-xs">
                    swarmrise_selected_orga
                  </td>
                  <td className="py-2">Selected organization</td>
                  <td className="py-2">Persistent</td>
                </tr>
              </tbody>
            </table>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              7.2 Authentication Cookies
            </h3>
            <p>
              Clerk (our authentication provider) uses session cookies for
              authentication state management. These are strictly necessary for
              the Service to function and do not require consent under the
              ePrivacy Directive.
            </p>

            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mt-4">
              7.3 No Tracking Cookies
            </h3>
            <p>
              We do not use analytics, advertising, or tracking cookies. We do
              not engage in behavioral tracking or targeted advertising.
            </p>
          </PrivacySection>

          <PrivacySection number={8} title="data security">
            <p>
              We implement appropriate technical and organizational measures to
              protect your personal data against unauthorized access, alteration,
              disclosure, or destruction:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Encryption in transit:</strong> All data transmitted
                between your browser and our servers is encrypted using TLS/SSL.
              </li>
              <li>
                <strong>Secure authentication:</strong> We use Clerk, a
                specialized authentication provider, with industry-standard
                security practices.
              </li>
              <li>
                <strong>Multi-tenant isolation:</strong> Organization data is
                logically isolated to prevent unauthorized cross-organization
                access.
              </li>
              <li>
                <strong>Access controls:</strong> Role-based access controls
                ensure users can only access data they are authorized to view.
              </li>
              <li>
                <strong>Regular security reviews:</strong> We conduct regular
                security assessments of our codebase and infrastructure.
              </li>
            </ul>
            <p>
              While we strive to protect your personal data, no method of
              transmission over the internet or electronic storage is 100%
              secure. We cannot guarantee absolute security.
            </p>
          </PrivacySection>

          <PrivacySection number={9} title="international data transfers">
            <p>
              Your personal data may be transferred to and processed in
              countries outside your country of residence, including the United
              States, where our third-party service providers (Clerk and Convex)
              are located.
            </p>
            <p>
              For transfers of personal data from the EEA, UK, or Switzerland to
              countries that have not been deemed to provide an adequate level
              of data protection, we rely on appropriate safeguards including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Standard Contractual Clauses (SCCs) approved by the European
                Commission
              </li>
              <li>Data Processing Agreements with our service providers</li>
              <li>
                Supplementary measures where necessary to address specific risks
              </li>
            </ul>
            <p>
              You may request a copy of the safeguards we have in place by
              contacting us.
            </p>
          </PrivacySection>

          <PrivacySection number={10} title="children's privacy">
            <p>
              The Service is not intended for children under the age of 16. We
              do not knowingly collect personal data from children under 16. If
              you are a parent or guardian and believe your child has provided
              us with personal data, please contact us immediately.
            </p>
            <p>
              If we become aware that we have collected personal data from a
              child under 16 without verification of parental consent, we will
              take steps to delete that information promptly.
            </p>
          </PrivacySection>

          <PrivacySection number={11} title="changes to this policy">
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices or applicable laws. When we make material
              changes:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                We will update the "Last Updated" date at the top of this policy
              </li>
              <li>
                We will notify you by email or through a prominent notice on the
                Service
              </li>
              <li>
                For significant changes affecting your rights, we may request
                renewed consent
              </li>
            </ul>
            <p>
              We encourage you to review this Privacy Policy periodically to
              stay informed about how we protect your information.
            </p>
          </PrivacySection>

          <PrivacySection number={12} title="contact information">
            <p>
              If you have questions about this Privacy Policy, wish to exercise
              your data protection rights, or have concerns about our data
              practices, please contact us:
            </p>
            <ul className="list-none space-y-2">
              <li>
                <strong>GitHub:</strong>{" "}
                <a
                  href="https://github.com/yves-christol/swarmrise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#eac840] hover:underline"
                >
                  github.com/yves-christol/swarmrise
                </a>
              </li>
            </ul>
            <p className="mt-4">
              We will respond to all legitimate requests within 30 days. In some
              cases, we may need to verify your identity before processing your
              request.
            </p>
          </PrivacySection>
        </div>

        {/* Related documents */}
        <section className="border-t border-gray-300 dark:border-gray-700 pt-8">
          <h2 className="font-swarm text-xl font-bold mb-4">
            related documents
          </h2>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <Link to="/terms" className="text-[#eac840] hover:underline">
                Terms of Service
              </Link>
              {" "}- Our terms and conditions for using Swarmrise
            </li>
            <li>
              <Link to="/principles" className="text-[#eac840] hover:underline">
                Our Principles
              </Link>
              {" "}- Learn about the values that guide Swarmrise
            </li>
          </ul>
        </section>

        {/* Footer */}
        <section className="text-center py-8 border-t border-gray-300 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-swarm text-[#eac840]">swarmrise</span> is
            licensed under Apache License 2.0
          </p>
        </section>
      </main>
    </>
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
        <span className="text-xs text-gray-400 dark:text-gray-600 font-mono w-6">
          {String(number).padStart(2, "0")}
        </span>
        <h2 className="font-swarm text-xl font-bold">{title}</h2>
      </div>
      <div className="pl-9 space-y-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </article>
  );
};
