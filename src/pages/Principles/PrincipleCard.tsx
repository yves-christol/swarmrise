import { renderBrandText } from "../../components/shared/BrandText";

type PrincipleCardProps = {
  title: string;
  content: string;
  index: number;
};

export const PrincipleCard = ({ title, content, index }: PrincipleCardProps) => {
  return (
    <article
      className="flex flex-col gap-3 group principle-card"
      style={{ animationDelay: `${0.1 + index * 0.05}s` }}
    >
      <div className="flex items-baseline gap-3">
        <span className="text-xs opacity-50 font-mono w-6">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="font-swarm text-xl font-bold group-hover:text-gold transition-colors duration-200">
          {title.toLowerCase()}
        </h2>
      </div>

      <p className="text-base leading-relaxed pl-9">
        {renderBrandText(content)}
      </p>
    </article>
  );
};
