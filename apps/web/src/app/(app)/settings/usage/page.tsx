'use client';

import { useQuery } from '@tanstack/react-query';
import { usageApi } from '@/lib/api';

function UsageContent() {
  const { data, isLoading } = useQuery({
    queryKey: ['usage'],
    queryFn: usageApi.summary,
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-lg font-medium">Usage</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          {isLoading && <p className="text-muted text-sm">Loading...</p>}

          {data && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                <div
                  data-testid="usage-summary-card"
                  className="glass col-span-2 min-w-0 rounded-2xl p-4 sm:col-span-1"
                >
                  <div className="text-xl font-medium tabular-nums sm:text-2xl">
                    {data.totalTokens.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-muted">Total tokens</div>
                </div>
                <div
                  data-testid="usage-summary-card"
                  className="glass min-w-0 rounded-2xl p-4"
                >
                  <div className="text-xl font-medium tabular-nums sm:text-2xl">
                    {data.totalPromptTokens.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-muted">Prompt tokens</div>
                </div>
                <div
                  data-testid="usage-summary-card"
                  className="glass min-w-0 rounded-2xl p-4"
                >
                  <div className="text-xl font-medium tabular-nums sm:text-2xl">
                    {data.totalCompletionTokens.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-muted">Completion tokens</div>
                </div>
              </div>

              {Object.keys(data.byModel).length > 0 && (
                <div>
                  <h2 className="text-sm font-medium mb-3 text-muted">By model</h2>
                  <div className="space-y-2">
                    {Object.entries(data.byModel).map(([model, stats]) => (
                      <div
                        key={model}
                        className="glass-pill flex min-w-0 items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
                      >
                        <span className="min-w-0 truncate">{model}</span>
                        <span className="shrink-0 text-xs text-muted sm:text-sm">
                          {(stats.promptTokens + stats.completionTokens).toLocaleString()} tokens
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.byDay.length > 0 && (
                <div>
                  <h2 className="text-sm font-medium mb-3 text-muted">By day</h2>
                  <div className="space-y-1">
                    {data.byDay.map((day) => (
                      <div
                        key={day.date}
                        className="flex justify-between rounded-lg px-4 py-2 text-sm hover:bg-white/5"
                      >
                        <span className="text-muted">{day.date}</span>
                        <span>{day.tokens.toLocaleString()} tokens</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UsagePage() {
  return <UsageContent />;
}
