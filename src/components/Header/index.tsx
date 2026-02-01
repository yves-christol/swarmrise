"use client";
import { dark } from "@clerk/themes";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router";
import { Logo } from "../Logo";
import { OrgaSelector } from "../OrgaSelector";

type HeaderProps = {
  showBackButton?: boolean;
};

export const Header = ({ showBackButton = false }: HeaderProps) => {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
      {/* Left side: Back button or Logo/brand */}
      {showBackButton ? (
        <Link
          to="/"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity text-light"
          aria-label="Go back to home"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">back</span>
        </Link>
      ) : (
        <Link
          to="/principles"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="View swarmrise principles"
        >
          <Logo size={24} begin={2} repeatCount={1} />
          <b className="font-swarm text-light">swarmrise</b>
        </Link>
      )}

      {/* Center: Organization selector (only when signed in) */}
      {isSignedIn && (
        <div className="flex-1 flex justify-center">
          <OrgaSelector />
        </div>
      )}

      {/* Right side: User button */}
      <div className="flex items-center">
        {isSignedIn && <UserButton appearance={{ baseTheme: dark }} />}
      </div>
    </header>
  );
};
