'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search, Trash2, RefreshCw } from 'lucide-react';
import { documentsApi } from '@/lib/api';
import { DocumentUploadButton } from '@/components/documents/DocumentUploadButton';

function DocumentsContent() {
  const [search, setSearch] = useState('');
  const [reindexMsg, setReindexMsg] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
  });

  const deleteDoc = useMutation({
    mutationFn: documentsApi.remove,
    onSuccess: () => {
      setDeleteError('');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const reindex = useMutation({
    mutationFn: documentsApi.reindex,
    onSuccess: (data) => {
      setReindexMsg(`Re-indexed ${data.documentsProcessed} documents (${data.totalChunks} chunks)`);
      setTimeout(() => setReindexMsg(''), 5000);
    },
    onError: (err: Error) => setReindexMsg(err.message),
  });

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    deleteDoc.mutate(id);
  };

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-medium">Documents</h1>
          <div className="flex gap-2">
            <DocumentUploadButton
              onStatus={(message, isError) => {
                setUploadMsg(message);
                setUploadError(!!isError);
                if (!isError) setTimeout(() => setUploadMsg(''), 5000);
              }}
            />
            <button
              onClick={() => reindex.mutate()}
              disabled={reindex.isPending}
              className="glass-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-muted transition-all hover:text-white"
            >
              <RefreshCw size={14} className={reindex.isPending ? 'animate-spin' : ''} />
              Re-index
            </button>
            <Link
              href="/documents/new"
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm text-white hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
              New
            </Link>
          </div>
        </div>
        {uploadMsg && (
          <p
            className={`mx-auto mt-2 max-w-3xl text-sm ${uploadError ? 'text-red-400' : 'text-muted'}`}
          >
            {uploadMsg}
          </p>
        )}
        {reindexMsg && (
          <p className="mx-auto mt-2 max-w-3xl text-sm text-muted">{reindexMsg}</p>
        )}
        {deleteError && (
          <p className="mx-auto mt-2 max-w-3xl text-sm text-red-400">{deleteError}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-xl glass-input py-2 pl-9 pr-4 text-sm outline-none focus:border-white/20"
            />
          </div>

          {isLoading && <p className="text-muted text-sm">Loading...</p>}

          {isError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 mb-4">
              {error instanceof Error ? error.message : 'Failed to load documents'}
              <button
                type="button"
                onClick={() => void refetch()}
                className="ml-3 text-accent hover:underline"
              >
                Retry
              </button>
            </div>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-muted mb-4">No documents yet</p>
              <div className="flex flex-col items-center gap-2">
                <Link
                  href="/documents/new"
                  className="text-accent hover:underline text-sm"
                >
                  Create your first document
                </Link>
                <span className="text-xs text-muted">or upload PDF / TXT files (multiple allowed)</span>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {filtered.map((doc) => (
              <div
                key={doc.id}
                className="group flex items-center justify-between rounded-lg px-3 py-3 hover:bg-white/5 transition-colors"
              >
                <Link href={`/documents/${doc.id}`} className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{doc.title}</div>
                  <div className="text-xs text-muted mt-0.5">
                    {new Date(doc.updatedAt).toLocaleDateString()}
                    {doc.tags.length > 0 && ` · ${doc.tags.join(', ')}`}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, doc.id, doc.title)}
                  disabled={deleteDoc.isPending}
                  aria-label={`Delete ${doc.title}`}
                  className="shrink-0 text-muted hover:text-red-400 transition-colors p-2 md:opacity-0 md:group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return <DocumentsContent />;
}
