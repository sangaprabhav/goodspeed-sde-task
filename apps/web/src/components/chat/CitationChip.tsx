'use client';

import Link from 'next/link';
import type { Citation } from '@repo/shared';

interface CitationChipProps {
  citation: Citation;
  index?: number;
}

export function CitationChip({ citation, index }: CitationChipProps) {
  const params = new URLSearchParams({
    chunk: String(citation.chunkIndex),
  });
  if (citation.excerpt) {
    params.set('q', citation.excerpt.slice(0, 120));
  }

  const href = `/documents/${citation.documentId}?${params.toString()}`;
  const scorePercent = Math.round(citation.score * 100);

  return (
    <Link
      href={href}
      className="glass-pill group block min-w-0 rounded-xl px-3.5 py-3 transition-all hover:bg-white/10 hover:ring-1 hover:ring-accent/40"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-white/90">
          {index !== undefined && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/20 text-[10px] text-accent">
              {index + 1}
            </span>
          )}
          <span className="truncate">{citation.title}</span>
        </span>
        <span className="shrink-0 rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] tabular-nums text-muted">
          {scorePercent}% match
        </span>
      </div>
      {citation.excerpt && (
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted transition-colors group-hover:text-white/70">
          &ldquo;{citation.excerpt.trim()}&rdquo;
        </p>
      )}
    </Link>
  );
}
