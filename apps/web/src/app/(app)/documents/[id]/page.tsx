'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Trash2, X } from 'lucide-react';
import { documentsApi } from '@/lib/api';
import { DocumentHighlightView } from '@/components/documents/DocumentHighlightView';

function DocumentEditorContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const chunkParam = searchParams.get('chunk');
  const excerptParam = searchParams.get('q');
  const chunkIndex =
    chunkParam !== null && !Number.isNaN(parseInt(chunkParam, 10))
      ? parseInt(chunkParam, 10)
      : null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'saved' | 'saving' | 'indexing' | ''>('');
  const [actionError, setActionError] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();
  const isNew = id === 'new';

  const { data: doc, isLoading, isError, error: loadError, refetch } = useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsApi.get(id),
    enabled: !isNew,
  });

  const { data: chunkMeta } = useQuery({
    queryKey: ['document-chunk', id, chunkIndex],
    queryFn: () => documentsApi.getChunk(id, chunkIndex!),
    enabled: !isNew && chunkIndex !== null,
  });

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      setContent(doc.content);
      setTags(doc.tags.join(', '));
    }
  }, [doc]);

  const save = useMutation({
    mutationFn: async () => {
      const tagList = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (isNew) {
        return documentsApi.create({ title, content, tags: tagList });
      }
      return documentsApi.update(id, { title, content, tags: tagList });
    },
    onMutate: () => {
      setStatus('saving');
      setActionError('');
    },
    onSuccess: (data) => {
      setStatus(data.ingestion ? 'indexing' : 'saved');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', id] });
      if (isNew) router.replace(`/documents/${data.id}`);
      setTimeout(() => setStatus('saved'), 2000);
      setTimeout(() => setStatus(''), 4000);
    },
    onError: (err: Error) => {
      setStatus('');
      setActionError(err.message);
    },
  });

  const remove = useMutation({
    mutationFn: () => documentsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      router.push('/documents');
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const handleDelete = () => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    remove.mutate();
  };

  const showHighlight = !isNew && chunkIndex !== null;

  if (!isNew && isLoading) {
    return <div className="flex flex-1 items-center justify-center text-muted">Loading...</div>;
  }

  if (!isNew && isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-red-400">
          {loadError instanceof Error ? loadError.message : 'Failed to load document'}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-sm text-accent hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Document title"
            className="min-w-0 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-muted"
          />
          <div className="flex shrink-0 items-center gap-2">
            {status && <span className="text-xs capitalize text-muted">{status}...</span>}
            {!isNew && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={remove.isPending}
                className="glass-pill rounded-xl p-1.5 text-muted transition-all hover:text-red-400"
                aria-label="Delete document"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => save.mutate()}
              disabled={!title.trim() || save.isPending}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
        {actionError && (
          <p className="mx-auto mt-2 max-w-3xl text-sm text-red-400">{actionError}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {showHighlight && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-accent">
                  Cited passage
                  {chunkIndex !== null && (
                    <span className="ml-2 text-xs font-normal text-muted">
                      chunk {chunkIndex + 1}
                    </span>
                  )}
                </p>
                <Link
                  href={`/documents/${id}`}
                  className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-white"
                >
                  <X size={12} />
                  Clear highlight
                </Link>
              </div>
              <DocumentHighlightView
                content={content}
                startOffset={chunkMeta?.startOffset ?? null}
                endOffset={chunkMeta?.endOffset ?? null}
                fallbackExcerpt={excerptParam ?? chunkMeta?.content}
              />
            </div>
          )}

          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="w-full rounded-xl glass-input px-4 py-2 text-sm outline-none focus:border-white/20"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your document in markdown..."
            className="w-full min-h-[50vh] resize-none rounded-xl glass-input px-4 py-3 font-mono text-sm leading-relaxed outline-none focus:border-white/20"
          />
        </div>
      </div>
    </div>
  );
}

function DocumentEditorFallback() {
  return <div className="flex flex-1 items-center justify-center text-muted">Loading...</div>;
}

export default function DocumentEditorPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <Suspense fallback={<DocumentEditorFallback />}>
      <DocumentEditorContent id={id} />
    </Suspense>
  );
}
