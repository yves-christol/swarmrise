import { memo, useMemo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type { Components } from "react-markdown";
import type { Plugin } from "unified";
import type { Root, Element, RootContent, ElementContent } from "hast";
import { MENTION_REGEX } from "../MessageInput/useMentionInput";

type MentionData = { displayName: string; memberId: string };

// Placeholder character unlikely to appear in user text.
// Must NOT be \x00 because CommonMark replaces null bytes with U+FFFD.
const PH = "\uFFFC";

/**
 * Replace @[Name](id) mentions with U+FFFC placeholders so they survive
 * markdown parsing untouched, and return a map of index → mention data.
 */
function preprocessMentions(text: string): {
  processed: string;
  mentions: Map<number, MentionData>;
} {
  const mentions = new Map<number, MentionData>();
  const regex = new RegExp(MENTION_REGEX.source, "g");
  let idx = 0;
  const processed = text.replace(regex, (_match, name: string, id: string) => {
    mentions.set(idx, { displayName: name, memberId: id });
    const placeholder = `${PH}M${PH}${idx}${PH}`;
    idx++;
    return placeholder;
  });
  return { processed, mentions };
}

/**
 * Rehype plugin that walks hast text nodes and converts mention placeholders
 * back into styled <span> elements.
 */
function createRehypeMentions(
  mentions: Map<number, MentionData>
): Plugin<[], Root> {
  const PLACEHOLDER_RE = /\uFFFCM\uFFFC(\d+)\uFFFC/g;

  return () => {
    function visit(node: Root | Element): void {
      if (!("children" in node)) return;

      const newChildren: (RootContent | ElementContent)[] = [];
      let changed = false;

      for (const child of node.children) {
        if (child.type === "text") {
          const text = child;
          if (!PLACEHOLDER_RE.test(text.value)) {
            newChildren.push(child);
            continue;
          }

          changed = true;
          PLACEHOLDER_RE.lastIndex = 0;
          let lastIndex = 0;
          let match;

          while ((match = PLACEHOLDER_RE.exec(text.value)) !== null) {
            // Text before the placeholder
            if (match.index > lastIndex) {
              newChildren.push({
                type: "text",
                value: text.value.slice(lastIndex, match.index),
              });
            }

            const mentionIdx = parseInt(match[1], 10);
            const mention = mentions.get(mentionIdx);
            if (mention) {
              newChildren.push({
                type: "element",
                tagName: "span",
                properties: {
                  "data-mention-id": mention.memberId,
                  "data-mention-name": mention.displayName,
                },
                children: [
                  { type: "text", value: `@${mention.displayName}` },
                ],
              });
            }

            lastIndex = match.index + match[0].length;
          }

          // Remaining text after last placeholder
          if (lastIndex < text.value.length) {
            newChildren.push({
              type: "text",
              value: text.value.slice(lastIndex),
            });
          }
        } else {
          if (child.type === "element") {
            visit(child);
          }
          newChildren.push(child);
        }
      }

      if (changed) {
        node.children = newChildren as typeof node.children;
      }
    }

    return (tree: Root) => {
      visit(tree);
    };
  };
}

const MENTION_CLASSES =
  "inline-flex items-baseline gap-0.5 rounded px-0.5 py-px bg-highlight/15 text-gold dark:text-highlight font-medium cursor-default";

/**
 * Custom component overrides for react-markdown.
 * Defined at module level so references are stable across renders.
 */
const MARKDOWN_COMPONENTS: Components = {
  // Mention chip spans (identified by data-mention-id)
  span({ node: _node, children, ...props }) {
    const mentionId = (props as Record<string, unknown>)["data-mention-id"];
    if (mentionId) {
      return (
        <span className={MENTION_CLASSES} {...props}>
          {children}
        </span>
      );
    }
    return <span {...props}>{children}</span>;
  },

  // Inline code
  code({ node: _node, children, className, ...props }) {
    // If it has a language class, it's inside a <pre> block — render as block code
    if (className && /language-/.test(className)) {
      return (
        <code className={`${className} text-xs`} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="bg-surface-tertiary rounded px-1 py-0.5 text-xs font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },

  // Code blocks
  pre({ node: _node, children, ...props }) {
    return (
      <pre
        className="bg-surface-tertiary rounded-md p-3 overflow-x-auto text-xs font-mono my-1"
        {...props}
      >
        {children}
      </pre>
    );
  },

  // Paragraphs
  p({ node: _node, children, ...props }) {
    return (
      <p className="my-0.5 first:mt-0 last:mb-0" {...props}>
        {children}
      </p>
    );
  },

  // Blockquotes
  blockquote({ node: _node, children, ...props }) {
    return (
      <blockquote
        className="border-l-2 border-border-strong pl-3 text-text-description my-1"
        {...props}
      >
        {children}
      </blockquote>
    );
  },

  // Lists
  ul({ node: _node, children, ...props }) {
    return (
      <ul className="list-disc pl-5 my-1" {...props}>
        {children}
      </ul>
    );
  },
  ol({ node: _node, children, ...props }) {
    return (
      <ol className="list-decimal pl-5 my-1" {...props}>
        {children}
      </ol>
    );
  },
  li({ node: _node, children, ...props }) {
    return (
      <li className="my-0" {...props}>
        {children}
      </li>
    );
  },

  // Links (open in new tab)
  a({ node: _node, children, ...props }) {
    return (
      <a
        className="text-highlight hover:underline"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },

  // Bold
  strong({ node: _node, children, ...props }) {
    return (
      <strong className="font-semibold" {...props}>
        {children}
      </strong>
    );
  },

  // Italic
  em({ node: _node, children, ...props }) {
    return (
      <em className="italic" {...props}>
        {children}
      </em>
    );
  },

  // Strikethrough
  del({ node: _node, children, ...props }) {
    return (
      <del className="line-through" {...props}>
        {children}
      </del>
    );
  },
};

// Stable plugin arrays (prevents react-markdown re-parsing on every render)
const REMARK_PLUGINS = [remarkBreaks, [remarkGfm, { singleTilde: false }]] as Parameters<typeof Markdown>[0]["remarkPlugins"];

const DISALLOWED_ELEMENTS = [
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "img",
];

type MarkdownMessageProps = {
  text: string;
};

// Regex to detect markdown syntax that would produce different output than plain text.
// Covers: headings, bold, italic, strikethrough, code, links, images, lists, blockquotes, hrs
// eslint-disable-next-line no-useless-escape
const MD_SYNTAX_RE = /[*_~`#\[\]!\->]|^\s*\d+\./m;

export const MarkdownMessage = memo(function MarkdownMessage({
  text,
}: MarkdownMessageProps) {
  const { processed, mentions, rehypePlugin, isPlainText } = useMemo(() => {
    const { processed, mentions } = preprocessMentions(text);
    const rehypePlugin = createRehypeMentions(mentions);
    // Fast path: no mentions and no markdown-like syntax
    const isPlainText = mentions.size === 0 && !MD_SYNTAX_RE.test(text);
    return { processed, mentions, rehypePlugin, isPlainText };
  }, [text]);

  // Must be before early return to satisfy rules-of-hooks
  const rehypePlugins = useMemo(
    () => (mentions.size > 0 ? [rehypePlugin] : []),
    [mentions.size, rehypePlugin]
  );

  // Fast path: render plain text with newline handling (like remark-breaks)
  if (isPlainText) {
    const lines = text.split("\n");
    return (
      <p className="my-0.5 first:mt-0 last:mb-0">
        {lines.map((line, i) => (
          <span key={i}>
            {line}
            {i < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  }

  return (
    <Markdown
      remarkPlugins={REMARK_PLUGINS}
      rehypePlugins={rehypePlugins}
      components={MARKDOWN_COMPONENTS}
      disallowedElements={DISALLOWED_ELEMENTS}
      unwrapDisallowed
    >
      {processed}
    </Markdown>
  );
});
