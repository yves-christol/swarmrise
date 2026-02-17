import type { GlossaryEntry } from "./glossary";
import { renderBrandText } from "../../components/shared/BrandText";

type GlossaryCardProps = GlossaryEntry & {
  index: number;
};

export const GlossaryCard = ({ title, description, example, index }: GlossaryCardProps) => {
  return (
    <article
      className="flex flex-col gap-3 group glossary-card"
      style={{ animationDelay: `${0.1 + index * 0.05}s` }}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-xs opacity-50 font-mono w-6">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="text-xl font-bold group-hover:text-gold transition-colors duration-200">
          {title.toLowerCase()}
        </h2>
      </div>

      <p className="text-base leading-relaxed pl-9">
        {renderBrandText(description)}
      </p>

      {example && example.trim() !== "" && (
        <p className="text-sm leading-relaxed pl-9 opacity-70 italic border-l-2 border-gold/30 ml-9 pl-4">
          {renderBrandText(example)}
        </p>
      )}
    </article>
  );
};
