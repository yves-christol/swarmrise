import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Components } from "react-markdown";

const REMARK_PLUGINS = [remarkBreaks, [remarkGfm, { singleTilde: false }]] as Parameters<typeof Markdown>[0]["remarkPlugins"];

const COMPONENTS: Components = {
  h1({ node: _node, children, ...props }) {
    return <h1 className="text-2xl font-bold mt-6 mb-3 text-dark dark:text-light" {...props}>{children}</h1>;
  },
  h2({ node: _node, children, ...props }) {
    return <h2 className="text-xl font-semibold mt-5 mb-2 text-dark dark:text-light" {...props}>{children}</h2>;
  },
  h3({ node: _node, children, ...props }) {
    return <h3 className="text-lg font-semibold mt-4 mb-2 text-dark dark:text-light" {...props}>{children}</h3>;
  },
  p({ node: _node, children, ...props }) {
    return <p className="my-2 leading-relaxed" {...props}>{children}</p>;
  },
  ul({ node: _node, children, ...props }) {
    return <ul className="list-disc pl-6 my-2 space-y-1" {...props}>{children}</ul>;
  },
  ol({ node: _node, children, ...props }) {
    return <ol className="list-decimal pl-6 my-2 space-y-1" {...props}>{children}</ol>;
  },
  li({ node: _node, children, ...props }) {
    return <li className="leading-relaxed" {...props}>{children}</li>;
  },
  a({ node: _node, children, ...props }) {
    return (
      <a className="text-highlight hover:underline" target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  blockquote({ node: _node, children, ...props }) {
    return (
      <blockquote className="border-l-3 border-highlight/40 pl-4 my-3 text-text-description italic" {...props}>
        {children}
      </blockquote>
    );
  },
  code({ node: _node, children, className, ...props }) {
    if (className && /language-/.test(className)) {
      return <code className={`${className} text-sm`} {...props}>{children}</code>;
    }
    return (
      <code className="bg-surface-tertiary rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
        {children}
      </code>
    );
  },
  pre({ node: _node, children, ...props }) {
    return (
      <pre className="bg-surface-tertiary rounded-lg p-4 overflow-x-auto text-sm font-mono my-3" {...props}>
        {children}
      </pre>
    );
  },
  strong({ node: _node, children, ...props }) {
    return <strong className="font-semibold" {...props}>{children}</strong>;
  },
  em({ node: _node, children, ...props }) {
    return <em className="italic" {...props}>{children}</em>;
  },
  hr({ node: _node, ...props }) {
    return <hr className="border-border-default my-4" {...props} />;
  },
  table({ node: _node, children, ...props }) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="w-full text-sm border-collapse" {...props}>{children}</table>
      </div>
    );
  },
  th({ node: _node, children, ...props }) {
    return (
      <th className="border border-border-default px-3 py-2 bg-surface-tertiary text-left font-semibold" {...props}>
        {children}
      </th>
    );
  },
  td({ node: _node, children, ...props }) {
    return (
      <td className="border border-border-default px-3 py-2" {...props}>{children}</td>
    );
  },
};

type PolicyMarkdownProps = {
  text: string;
};

export const PolicyMarkdown = memo(function PolicyMarkdown({ text }: PolicyMarkdownProps) {
  return (
    <div className="text-text-description">
      <Markdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {text}
      </Markdown>
    </div>
  );
});
