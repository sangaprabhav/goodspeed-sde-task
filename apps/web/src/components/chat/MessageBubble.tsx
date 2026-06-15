'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';
import type { Citation } from '@repo/shared';
import { CitationChip } from './CitationChip';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
}

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 mt-6 text-xl font-semibold tracking-tight first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-5 text-lg font-semibold tracking-tight first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-3 leading-7 last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1.5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1.5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7 pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-white/20 pl-4 text-muted italic last:mb-0">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline underline-offset-2 hover:opacity-80"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-white/90">{children}</em>,
  hr: () => <hr className="my-4 border-white/10" />,
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-white/15">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 text-left font-semibold text-white/90">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-white/10 px-3 py-2 align-top">{children}</td>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code className={`block font-mono text-[0.8125rem] leading-6 ${className ?? ''}`}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[0.8125rem] text-accent">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="glass mb-3 overflow-x-auto rounded-xl p-4 text-sm last:mb-0">{children}</pre>
  ),
};

export function MessageBubble({ role, content, citations, streaming }: MessageBubbleProps) {
  if (role === 'user') {
    return (
      <div className="mb-8 flex justify-end">
        <div className="glass-pill max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[72%]">
          {content}
        </div>
      </div>
    );
  }

  if (!content && streaming) {
    return (
      <div className="mb-8 flex items-center gap-2 text-xs text-muted">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
        Searching your knowledge base...
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="chat-markdown text-[15px] text-white/90">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
        {streaming && (
          <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-white/60 align-middle" />
        )}
      </div>
      {citations && citations.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
            Sources
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {citations.map((c, i) => (
              <CitationChip key={`${c.chunkId}-${i}`} citation={c} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
