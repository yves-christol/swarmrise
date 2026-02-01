"use client";
import { dark } from "@clerk/themes";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { Logo } from "../Logo";
import { OrgaSelector } from "../OrgaSelector";

export const Header = () => {
  const { isSignedIn } = useAuth();

  return (
    <header className="sticky top-0 z-10 bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
      {/* Left side: Logo and brand */}
      <div className="flex items-center gap-2">
        <Logo size={24} begin={2} repeatCount={1} />
        <b className="font-swarm text-light">swarmrise</b>
      </div>

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
