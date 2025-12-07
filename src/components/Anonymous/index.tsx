"use client";
import { SignInForm } from "../SignInForm"

export const Anonymous = () => {
  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto">
      <h1 className="font-swarm text-4xl font-bold text-center">
        welcome!
      </h1>
      <p>
        Swarmrise is a light governance model, providing clarity and traceability in the organization and decision process without the burden of bureaucracy.
      </p>
      <SignInForm />
      <div className="flex flex-col">
        <p className="text-lg font-bold">Useful resources:</p>
        <div className="flex gap-2">
          <div className="flex flex-col gap-2 w-1/2">
            <ResourceCard
              title="The principles"
              description="Discover the few simple concepts that run the show."
              href="https://docs.convex.dev/home"
            />
            <ResourceCard
              title="The product"
              description="Discover the main features of the product and see it."
              href="https://www.typescriptlang.org/docs/handbook/2/basic-types.html"
            />
          </div>
          <div className="flex flex-col gap-2 w-1/2">
            <ResourceCard
              title="Testimonies"
              description="Read some feedback we get so far."
              href="https://www.convex.dev/templates"
            />
            <ResourceCard
              title="Inspiration"
              description="Browse some inspirational content, useful tricks and funny stuff."
              href="https://www.convex.dev/community"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const ResourceCard = ({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) => {
  return (
    <div className="flex flex-col gap-2 bg-slate-200 dark:bg-slate-800 p-4 rounded-md h-28 overflow-auto">
      <a href={href} className="text-sm underline hover:no-underline">
        {title}
      </a>
      <p className="text-xs">{description}</p>
    </div>
  );
}
