import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { Header } from "../../components/Header";
import { FloatingBackButton } from "../../components/FloatingLogo";
import { Logo } from "../../components/Logo";
import { LegalFooter } from "../../components/LegalFooter";
import { renderBrandText } from "../../components/shared/BrandText";
import { useSelectedOrga } from "../../tools/orgaStore/hooks";
import { useChatStore } from "../../tools/chatStore/hooks";
import { routes } from "../../routes";
import type { ReactNode } from "react";

// --- Icons (line/outline, 24x24 viewBox) ---

const CompassIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="12" r="10" />
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const FileTextIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const NetworkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="12" cy="5" r="3" />
    <circle cx="5" cy="19" r="3" />
    <circle cx="19" cy="19" r="3" />
    <line x1="12" y1="8" x2="5" y2="16" />
    <line x1="12" y1="8" x2="19" y2="16" />
  </svg>
);

const MessageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// --- NavigationCard ---

type NavigationCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
} & (
  | { to: string; onClick?: never }
  | { onClick: () => void; to?: never }
);

const NavigationCard = ({ icon, title, description, ...rest }: NavigationCardProps) => {
  const className =
    "group flex items-start gap-4 p-4 bg-surface-primary border border-border-default rounded-lg hover:border-highlight hover:shadow-md transition-all duration-75 focus:outline-none focus:ring-2 focus:ring-highlight";

  const content = (
    <>
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center group-hover:bg-highlight/10 transition-colors duration-75 text-text-secondary group-hover:text-highlight-hover">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-dark dark:text-light group-hover:text-highlight-hover transition-colors duration-75">
          {title}
        </h3>
        <p className="text-sm text-text-description mt-0.5 leading-relaxed">
          {description}
        </p>
      </div>
    </>
  );

  if ("onClick" in rest && rest.onClick) {
    return (
      <button onClick={rest.onClick} className={`${className} text-left w-full`}>
        {content}
      </button>
    );
  }

  return (
    <Link to={rest.to!} className={className}>
      {content}
    </Link>
  );
};

// --- WelcomePage ---

export const WelcomePage = () => {
  const { t } = useTranslation("welcome");
  const { t: tGlossary } = useTranslation("glossary");
  const { t: tLegal } = useTranslation("legal");
  const { isSignedIn } = useAuth();
  const { selectedOrgaId, selectedOrga, myMember } = useSelectedOrga();
  const { openChat } = useChatStore();

  const exploreCards = [
    {
      icon: <CompassIcon />,
      title: tLegal("principles.title"),
      description: t("cards.principles.description"),
      to: "/principles",
    },
    {
      icon: <BookIcon />,
      title: tGlossary("title"),
      description: t("cards.glossary.description"),
      to: "/glossary",
    },
    {
      icon: <FileTextIcon />,
      title: tLegal("terms.title"),
      description: t("cards.terms.description"),
      to: "/terms",
    },
    {
      icon: <ShieldIcon />,
      title: tLegal("privacy.title"),
      description: t("cards.privacy.description"),
      to: "/privacy",
    },
  ];

  const showWorkspace = isSignedIn && selectedOrga && selectedOrgaId;

  const workspaceCards = showWorkspace
    ? [
        {
          icon: <NetworkIcon />,
          title: t("cards.organization.title"),
          description: t("cards.organization.description"),
          to: routes.orga(selectedOrgaId),
        },
        {
          icon: <MessageIcon />,
          title: t("cards.chat.title"),
          description: t("cards.chat.description"),
          onClick: openChat,
        },
        ...(myMember
          ? [
              {
                icon: <UserIcon />,
                title: t("cards.myPage.title"),
                description: t("cards.myPage.description"),
                to: routes.member(selectedOrgaId, myMember._id),
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="swarmrise-page">
      <Header />
      <FloatingBackButton />
      <main className="p-8 flex flex-col gap-16 max-w-4xl mx-auto">
        {/* Hero */}
        <section className="flex flex-col items-center gap-6 text-center pt-8 pb-4">
          <Logo size={80} begin={0} repeatCount={2} />
          <h1 className="text-4xl font-bold">
            {t("title")}
          </h1>
          <p className="text-lg max-w-2xl opacity-80 leading-relaxed">
            {renderBrandText(t("subtitle"))}
          </p>
          <p className="text-sm text-text-secondary">
            {t("subline")}
          </p>
        </section>

        {/* Explore swarmrise */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary mb-4">
            {t("explore")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {exploreCards.map((card) => (
              <NavigationCard key={card.to} {...card} />
            ))}
          </div>
        </section>

        {/* Your workspace */}
        {showWorkspace && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-secondary mb-4">
              {t("workspace")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workspaceCards.map((card, i) => (
                <NavigationCard key={"to" in card && card.to ? card.to : `action-${i}`} {...card} />
              ))}
            </div>
          </section>
        )}
      </main>

      <LegalFooter />
    </div>
  );
};
