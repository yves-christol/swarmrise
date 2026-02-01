import { Link } from "react-router";
import { Header } from "../../components/Header";
import { Logo } from "../../components/Logo";
import { PrincipleCard } from "./PrincipleCard";
import { principles } from "./principles";

export const PrinciplesPage = () => {
  return (
    <>
      <Header showBackButton />
      <main className="p-8 flex flex-col gap-16 max-w-3xl mx-auto">
        {/* Hero section */}
        <section className="flex flex-col items-center gap-6 text-center pt-8">
          <Logo size={64} begin={0} repeatCount={2} />
          <h1 className="font-swarm text-4xl font-bold">our principles</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl">
            Simple ideas that guide how swarmrise works.
          </p>
        </section>

        {/* Principles list */}
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

        {/* Legal documents */}
        <section className="border-t border-gray-300 dark:border-gray-700 pt-8">
          <h2 className="font-swarm text-xl font-bold mb-4">legal</h2>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <Link to="/terms" className="text-[#eac840] hover:underline">
                Terms of Service
              </Link>
              {" "}- the conditions for using swarmrise
            </li>
            <li>
              <Link to="/privacy" className="text-[#eac840] hover:underline">
                Privacy Policy
              </Link>
              {" "}- how we handle your personal data
            </li>
          </ul>
        </section>

        {/* Footer */}
        <section className="text-center py-8 border-t border-gray-300 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            swarmrise is a work in progress.
          </p>
        </section>
      </main>
    </>
  );
};
