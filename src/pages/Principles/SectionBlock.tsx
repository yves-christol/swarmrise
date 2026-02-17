import type { ReactNode } from "react";
import { renderBrandText } from "../../components/shared/BrandText";

type SectionBlockProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export const SectionBlock = ({ title, subtitle, children }: SectionBlockProps) => {
  return (
    <section className="flex flex-col gap-6 principle-card">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold">
          {title.toLowerCase()}
        </h2>
        {subtitle && (
          <p className="text-base opacity-70 italic">
            {renderBrandText(subtitle)}
          </p>
        )}
      </div>
      {children}
    </section>
  );
};

type SectionParagraphProps = {
  children: string;
};

export const SectionParagraph = ({ children }: SectionParagraphProps) => {
  return (
    <p className="text-base leading-relaxed">
      {renderBrandText(children)}
    </p>
  );
};

type SectionItemProps = {
  title: string;
  content: string;
};

export const SectionItem = ({ title, content }: SectionItemProps) => {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-lg font-semibold">{title.toLowerCase()}</h3>
      <p className="text-base leading-relaxed pl-4 border-l-2 border-gold/30">
        {renderBrandText(content)}
      </p>
    </div>
  );
};

type SectionListProps = {
  items: string[];
};

export const SectionList = ({ items }: SectionListProps) => {
  return (
    <ul className="flex flex-col gap-2 pl-4">
      {items.map((item, index) => (
        <li key={index} className="text-base leading-relaxed flex gap-2">
          <span className="text-gold opacity-60 select-none">--</span>
          <span>{renderBrandText(item)}</span>
        </li>
      ))}
    </ul>
  );
};
