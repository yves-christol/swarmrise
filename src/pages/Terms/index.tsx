import { Header } from "../../components/Header";
import { Logo } from "../../components/Logo";
import { Link } from "react-router";

export const TermsPage = () => {
  const effectiveDate = "February 1, 2026";
  const lastUpdated = "February 1, 2026";

  return (
    <>
      <Header showBackButton />
      <main className="p-8 flex flex-col gap-12 max-w-3xl mx-auto">
        {/* Hero section */}
        <section className="flex flex-col items-center gap-6 text-center pt-8">
          <Logo size={64} begin={0} repeatCount={2} />
          <h1 className="font-swarm text-4xl font-bold">terms of service</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Effective Date: {effectiveDate} | Last Updated: {lastUpdated}
          </p>
        </section>

        {/* Introduction */}
        <section className="flex flex-col gap-4">
          <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
            Welcome to <span className="font-swarm text-[#eac840]">swarmrise</span>.
            These Terms of Service ("Terms") govern your access to and use of the
            Swarmrise platform, including our website, applications, and services
            (collectively, the "Service"). By accessing or using the Service, you
            agree to be bound by these Terms.
          </p>
          <p className="text-base leading-relaxed text-gray-700 dark:text-gray-300">
            Please read these Terms carefully before using the Service. If you do
            not agree to these Terms, you may not access or use the Service.
          </p>
        </section>

        {/* Terms sections */}
        <div className="flex flex-col gap-10">
          <TermsSection number={1} title="acceptance of terms">
            <p>
              By creating an account or using the Service, you represent that you
              are at least 18 years of age and have the legal capacity to enter into
              these Terms. If you are using the Service on behalf of an organization,
              you represent and warrant that you have the authority to bind that
              organization to these Terms.
            </p>
            <p>
              We reserve the right to modify these Terms at any time. We will notify
              you of material changes by posting the updated Terms on the Service
              and updating the "Last Updated" date. Your continued use of the Service
              after such changes constitutes your acceptance of the modified Terms.
            </p>
          </TermsSection>

          <TermsSection number={2} title="description of service">
            <p>
              Swarmrise is a multi-tenant organization management platform designed
              for collaborative governance. The Service enables organizations to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Structure teams and define organizational hierarchies</li>
              <li>Create and manage roles within teams (including leader, secretary, and referee positions)</li>
              <li>Track decisions with full audit trails</li>
              <li>Manage organizational memberships and invitations</li>
              <li>Establish and maintain organizational policies</li>
            </ul>
            <p>
              We reserve the right to modify, suspend, or discontinue any aspect of
              the Service at any time, with or without notice.
            </p>
          </TermsSection>

          <TermsSection number={3} title="account registration and security">
            <p>
              To access certain features of the Service, you must create an account.
              When creating an account, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your authentication credentials secure and confidential</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
            </ul>
            <p>
              We use Clerk for authentication services. By using the Service, you
              also agree to Clerk's terms of service and privacy policy.
            </p>
          </TermsSection>

          <TermsSection number={4} title="organizations and membership">
            <p>
              The Service allows users to create and join organizations. When you
              create an organization, you become its owner and are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Managing organization settings and membership</li>
              <li>Ensuring members comply with these Terms</li>
              <li>The content and activities within your organization</li>
              <li>Properly handling invitations and access controls</li>
            </ul>
            <p>
              As an organization member, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Respect the governance structure established by the organization</li>
              <li>Use the Service in accordance with your assigned roles</li>
              <li>Not circumvent access controls or permission systems</li>
            </ul>
          </TermsSection>

          <TermsSection number={5} title="acceptable use">
            <p>
              You agree to use the Service only for lawful purposes and in accordance
              with these Terms. You agree NOT to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws, regulations, or third-party rights</li>
              <li>Use the Service to harass, abuse, or harm others</li>
              <li>Upload or transmit malicious code, viruses, or harmful content</li>
              <li>Attempt to gain unauthorized access to the Service or its systems</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Scrape, crawl, or use automated means to access the Service without permission</li>
              <li>Impersonate another person or entity</li>
              <li>Use the Service for any fraudulent or deceptive purposes</li>
              <li>Circumvent any security measures or access restrictions</li>
            </ul>
          </TermsSection>

          <TermsSection number={6} title="user content">
            <p>
              You retain ownership of any content you submit to the Service ("User
              Content"), including organizational data, team structures, role
              definitions, and decisions. By submitting User Content, you grant us a
              worldwide, non-exclusive, royalty-free license to use, store, and
              process your User Content solely for the purpose of providing the Service.
            </p>
            <p>
              You represent and warrant that:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You own or have the necessary rights to your User Content</li>
              <li>Your User Content does not violate any third-party rights</li>
              <li>Your User Content complies with these Terms and applicable laws</li>
            </ul>
          </TermsSection>

          <TermsSection number={7} title="intellectual property">
            <p>
              The Service, including its source code, design, features, and
              documentation, is licensed under the Apache License 2.0. This license
              allows you to use, modify, and distribute the software under certain
              conditions.
            </p>
            <p>
              The Swarmrise name, logo, and brand elements are proprietary and may
              not be used without our express written permission, except as permitted
              by the Apache License 2.0 for attribution purposes.
            </p>
            <p>
              Third-party components included in the Service are subject to their
              respective licenses, which are documented in our legal documentation.
            </p>
          </TermsSection>

          <TermsSection number={8} title="data protection and privacy">
            <p>
              We are committed to protecting your privacy and personal data. Our
              collection, use, and handling of personal data is governed by our
              Privacy Policy, which is incorporated into these Terms by reference.
            </p>
            <p>
              Key aspects of our data handling:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We collect only data necessary to provide the Service</li>
              <li>Your organizational data is isolated in a multi-tenant architecture</li>
              <li>We use Convex for secure data storage and processing</li>
              <li>Authentication data is managed by Clerk</li>
              <li>We maintain audit trails for transparency and accountability</li>
            </ul>
            <p>
              For users in the European Economic Area, we comply with the General
              Data Protection Regulation (GDPR) and provide mechanisms for exercising
              your data subject rights.
            </p>
          </TermsSection>

          <TermsSection number={9} title="service availability and support">
            <p>
              We strive to maintain the Service's availability but do not guarantee
              uninterrupted access. The Service may be temporarily unavailable due to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Scheduled maintenance and updates</li>
              <li>Unplanned outages or technical issues</li>
              <li>Factors beyond our reasonable control</li>
            </ul>
            <p>
              We provide the Service on an "as is" and "as available" basis without
              any service level agreements unless otherwise agreed in writing.
            </p>
          </TermsSection>

          <TermsSection number={10} title="limitation of liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, SWARMRISE AND ITS
              AFFILIATES, OFFICERS, EMPLOYEES, AGENTS, AND LICENSORS SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Loss of profits, data, or business opportunities</li>
              <li>Service interruptions or data loss</li>
              <li>Unauthorized access to your data</li>
              <li>Any conduct or content of third parties on the Service</li>
            </ul>
            <p>
              Our total liability for any claims arising from or related to the
              Service shall not exceed the amount you paid us, if any, in the twelve
              (12) months preceding the claim.
            </p>
          </TermsSection>

          <TermsSection number={11} title="indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless Swarmrise and its
              affiliates, officers, directors, employees, and agents from and against
              any claims, liabilities, damages, losses, and expenses (including
              reasonable legal fees) arising out of or in any way connected with:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your access to or use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your User Content</li>
              <li>Your violation of any third-party rights</li>
            </ul>
          </TermsSection>

          <TermsSection number={12} title="termination">
            <p>
              You may terminate your account at any time by contacting us or using
              the account deletion feature when available. We may terminate or suspend
              your access to the Service immediately, without prior notice, if:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You breach these Terms</li>
              <li>We are required to do so by law</li>
              <li>We decide to discontinue the Service</li>
            </ul>
            <p>
              Upon termination, your right to use the Service will cease immediately.
              Provisions of these Terms that by their nature should survive termination
              shall survive, including ownership, warranty disclaimers, indemnification,
              and limitations of liability.
            </p>
          </TermsSection>

          <TermsSection number={13} title="dispute resolution">
            <p>
              We encourage you to contact us first to resolve any disputes informally.
              If a dispute cannot be resolved informally, you agree that any legal
              action or proceeding shall be brought exclusively in the courts of
              competent jurisdiction.
            </p>
            <p>
              For users in the European Union, this provision does not affect your
              rights under consumer protection laws or your right to bring claims
              before the courts of your country of residence.
            </p>
          </TermsSection>

          <TermsSection number={14} title="governing law">
            <p>
              These Terms shall be governed by and construed in accordance with the
              laws of the jurisdiction in which the Service operator is established,
              without regard to conflict of law principles.
            </p>
            <p>
              For users in the European Economic Area, nothing in these Terms affects
              your rights as a consumer under applicable EU consumer protection laws.
            </p>
          </TermsSection>

          <TermsSection number={15} title="general provisions">
            <p>
              <strong>Entire Agreement:</strong> These Terms, together with our Privacy
              Policy and any other policies referenced herein, constitute the entire
              agreement between you and Swarmrise regarding the Service.
            </p>
            <p>
              <strong>Severability:</strong> If any provision of these Terms is found
              to be unenforceable, the remaining provisions will continue in full
              force and effect.
            </p>
            <p>
              <strong>Waiver:</strong> Our failure to enforce any right or provision
              of these Terms will not be considered a waiver of those rights.
            </p>
            <p>
              <strong>Assignment:</strong> You may not assign or transfer your rights
              under these Terms without our prior written consent. We may assign our
              rights and obligations without restriction.
            </p>
          </TermsSection>

          <TermsSection number={16} title="contact information">
            <p>
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-none space-y-2">
              <li><strong>GitHub:</strong>{" "}
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
          </TermsSection>
        </div>

        {/* Related documents */}
        <section className="border-t border-gray-300 dark:border-gray-700 pt-8">
          <h2 className="font-swarm text-xl font-bold mb-4">related documents</h2>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <Link to="/privacy" className="text-[#eac840] hover:underline">
                Privacy Policy
              </Link>
              {" "}- How we handle your personal data
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
            <span className="font-swarm text-[#eac840]">swarmrise</span> is licensed
            under Apache License 2.0
          </p>
        </section>
      </main>
    </>
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
