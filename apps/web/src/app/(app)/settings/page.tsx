'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import { settingsApi } from '@/lib/api';

function SettingsContent() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['settings', 'ai'],
    queryFn: settingsApi.getAI,
  });

  const [chatModel, setChatModel] = useState('');
  const [embeddingModel, setEmbeddingModel] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    if (data) {
      setChatModel(data.chatModel);
      setEmbeddingModel(data.embeddingModel);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      settingsApi.updateAI({
        chatModel,
        embeddingModel,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['settings', 'ai'], updated);
      setSaveError(false);
      setSaveMsg('Settings saved');
      setTimeout(() => setSaveMsg(''), 3000);
    },
    onError: (err: Error) => {
      setSaveError(true);
      setSaveMsg(err.message);
    },
  });

  const dirty =
    data && (chatModel !== data.chatModel || embeddingModel !== data.embeddingModel);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-lg font-medium">Settings</h1>
          <Link
            href="/settings/usage"
            className="glass-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-muted transition-all hover:text-white"
          >
            <BarChart3 size={14} />
            Usage
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {isLoading && <p className="text-sm text-muted">Loading...</p>}

          {isError && (
            <p className="text-sm text-red-400">
              {error instanceof Error ? error.message : 'Failed to load settings'}
            </p>
          )}

          {data && (
            <div className="glass space-y-6 rounded-2xl p-6">
              <div>
                <h2 className="text-sm font-medium mb-1">Chat model</h2>
                <p className="text-xs text-muted mb-3">
                  Used for answering questions in your conversations.
                </p>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value)}
                  className="w-full rounded-xl glass-input px-4 py-2.5 text-sm outline-none"
                >
                  {data.chatModels.map((model) => (
                    <option key={model.id} value={model.id} className="bg-black">
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <h2 className="text-sm font-medium mb-1">Embedding model</h2>
                <p className="text-xs text-muted mb-3">
                  Used to index and search your documents. Changing this requires re-indexing.
                </p>
                <select
                  value={embeddingModel}
                  onChange={(e) => setEmbeddingModel(e.target.value)}
                  className="w-full rounded-xl glass-input px-4 py-2.5 text-sm outline-none"
                >
                  {data.embeddingModels.map((model) => (
                    <option key={model.id} value={model.id} className="bg-black">
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>

              {(data.needsReindex || (dirty && embeddingModel !== data.embeddingModel)) && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Your documents were indexed with a different embedding model. Go to{' '}
                  <Link href="/documents" className="text-accent hover:underline">
                    Documents
                  </Link>{' '}
                  and click <strong>Re-index</strong> after saving.
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => save.mutate()}
                  disabled={!dirty || save.isPending}
                  className="rounded-xl bg-accent px-4 py-2 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {save.isPending ? 'Saving...' : 'Save changes'}
                </button>
                {saveMsg && (
                  <span className={`text-sm ${saveError ? 'text-red-400' : 'text-muted'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
