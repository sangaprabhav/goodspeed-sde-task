'use client';

import { useEffect, useRef } from 'react';

interface DocumentHighlightViewProps {
  content: string;
  startOffset: number | null;
  endOffset: number | null;
  fallbackExcerpt?: string;
}

export function resolveHighlightRange(
  content: string,
  startOffset: number | null,
  endOffset: number | null,
  fallbackExcerpt?: string,
): { start: number; end: number } | null {
  if (
    startOffset !== null &&
    endOffset !== null &&
    startOffset >= 0 &&
    endOffset > startOffset &&
    endOffset <= content.length
  ) {
    return { start: startOffset, end: endOffset };
  }

  if (fallbackExcerpt) {
    const exact = content.indexOf(fallbackExcerpt);
    if (exact >= 0) return { start: exact, end: exact + fallbackExcerpt.length };

    const trimmed = fallbackExcerpt.trim();
    if (trimmed.length > 20) {
      const partial = content.indexOf(trimmed.slice(0, Math.min(80, trimmed.length)));
      if (partial >= 0) {
        return { start: partial, end: partial + trimmed.slice(0, 80).length };
      }
    }
  }

  return null;
}

export function DocumentHighlightView({
  content,
  startOffset,
  endOffset,
  fallbackExcerpt,
}: DocumentHighlightViewProps) {
  const highlightRef = useRef<HTMLElement>(null);
  const range = resolveHighlightRange(content, startOffset, endOffset, fallbackExcerpt);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [range?.start, range?.end]);

  if (!range) {
    return (
      <p className="text-sm text-muted">
        Could not locate this passage in the document. Try re-indexing the document.
      </p>
    );
  }

  const before = content.slice(0, range.start);
  const highlighted = content.slice(range.start, range.end);
  const after = content.slice(range.end);

  return (
    <pre className="glass whitespace-pre-wrap rounded-xl p-4 text-sm font-mono leading-relaxed text-white/85">
      {before}
      <span
        ref={highlightRef}
        id="citation-highlight"
        className="citation-highlight"
      >
        {highlighted}
      </span>
      {after}
    </pre>
  );
}
