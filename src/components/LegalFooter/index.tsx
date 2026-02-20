import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Logo } from "../Logo";

type FooterLinkItem = {
  path: string;
  label: string;
};

export const LegalFooter = () => {
  const { t: tWelcome } = useTranslation("welcome");
  const { t: tGlossary } = useTranslation("glossary");
  const { t: tLegal } = useTranslation("legal");
  const { t: tBugReport } = useTranslation("bugReport");
  const location = useLocation();
  const currentPath = location.pathname;

  const footerLinks: FooterLinkItem[] = [
    { path: "/welcome", label: tWelcome("explore") },
    { path: "/glossary", label: tGlossary("title") },
    { path: "/principles", label: tLegal("principles.title") },
    { path: "/terms", label: tLegal("terms.title") },
    { path: "/privacy", label: tLegal("privacy.title") },
    { path: "/report", label: tBugReport("title") },
  ];

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-16">
      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Navigation links */}
        <nav className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-8">
          {footerLinks.map((link) => {
            const isActive = currentPath === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm transition-opacity ${
                  isActive
                    ? "text-gold font-medium cursor-default"
                    : "opacity-60 hover:opacity-100 hover:text-gold"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Brand mark and license */}
        <div className="flex flex-col items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="swarmrise home"
          >
            <Logo size={20} begin={0} repeatCount={0} />
            <span className="font-swarm text-sm">swarmrise</span>
          </Link>
          <p className="text-xs opacity-40 text-center">
            published by Yorga
          </p>
        </div>
      </div>
    </footer>
  );
};
