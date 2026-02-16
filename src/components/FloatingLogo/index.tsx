import { Link } from "react-router";
import { useAuth } from "@clerk/clerk-react";
import { Logo } from "../Logo";
import { useSelectedOrga } from "../../tools/orgaStore/hooks";

export const FloatingLogo = () => {
  const { isSignedIn } = useAuth();
  const { selectedOrga } = useSelectedOrga();

  if (!isSignedIn || !selectedOrga) return null;

  return (
    <Link
      to="/glossary"
      className="fixed bottom-4 left-4 z-20 w-10 h-10 rounded-full bg-light dark:bg-dark border border-slate-300 dark:border-slate-700 shadow-md flex items-center justify-center hover:scale-110 transition-transform"
      aria-label="swarmrise"
    >
      <Logo size={28} begin={2} repeatCount={1} />
    </Link>
  );
};
