'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { conversationsApi, streamChat, type Message } from '@/lib/api';
import type { Citation } from '@repo/shared';
import { welcomeBackMessage } from '@repo/shared';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { useAuth } from '@/lib/hooks/useAuth';

interface ChatThreadProps {
  conversationId: string;
}

export function ChatThread({ conversationId }: ChatThreadProps) {
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamCitations, setStreamCitations] = useState<Citation[]>([]);
  const [pendingUserMessage, setPendingUserMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => conversationsApi.getMessages(conversationId),
    enabled: !!conversationId,
  });
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.list,
  });
  const conversation = conversations.find((item) => item.id === conversationId);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return;

    const content = input.trim();
    setInput('');
    setStreaming(true);
    setPendingUserMessage(content);
    setStreamContent('');
    setStreamCitations([]);
    setError(null);

    abortRef.current = new AbortController();

    try {
      await streamChat(
        conversationId,
        content,
        {
          onToken: (text) => setStreamContent((prev) => prev + text),
          onCitation: (c) => setStreamCitations((prev) => [...prev, c]),
          onDone: () => {
            setStreaming(false);
            void queryClient
              .invalidateQueries({ queryKey: ['messages', conversationId] })
              .finally(() => setPendingUserMessage(''));
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            setStreamContent('');
            setStreamCitations([]);
          },
          onError: (err) => {
            setStreaming(false);
            void queryClient
              .invalidateQueries({ queryKey: ['messages', conversationId] })
              .finally(() => setPendingUserMessage(''));
            if (err.code === 'EMBEDDING_SPACE_MISMATCH') {
              setError(`${err.message} Click Documents → Re-index to fix.`);
            } else {
              setError(err.message);
            }
          },
        },
        abortRef.current.signal,
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setStreaming(false);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [input, streaming, conversationId, queryClient]);

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    void queryClient
      .invalidateQueries({ queryKey: ['messages', conversationId] })
      .finally(() => setPendingUserMessage(''));
  };

  const suggestedPrompts = [
    'What documents do I have?',
    'Summarize my knowledge base',
    'What are the key topics covered?',
  ];

  const showEmpty = !isLoading && messages.length === 0 && !streaming;

  return (
    <div className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5 md:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium text-white/90">
            {conversation?.title || 'Knowledge base chat'}
          </h1>
          <p className="mt-0.5 text-xs text-muted">Answers grounded in your documents</p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-2 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <span className="hidden sm:inline">Ready</span>
        </div>
      </header>

      <div className="scrollbar-stable min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-5 pb-8 pt-8 md:px-8 md:pt-10">
          {showEmpty && (
            <div className="flex min-h-[52vh] flex-col items-center justify-center text-center">
              <h2 className="mb-2 text-2xl font-medium">
                {welcomeBackMessage(user?.displayName)}
              </h2>
              <p className="mb-7 text-sm text-muted">
                Ask a question and I will search across your indexed documents.
              </p>
              <div className="flex max-w-2xl flex-wrap justify-center gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="glass-pill rounded-full px-4 py-2.5 text-sm text-muted transition-all hover:bg-white/10 hover:text-white"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg: Message) => (
            <MessageBubble
              key={msg.id}
              role={msg.role as 'user' | 'assistant'}
              content={msg.content}
              citations={msg.citations}
            />
          ))}

          {pendingUserMessage && <MessageBubble role="user" content={pendingUserMessage} />}

          {streaming && (
            <MessageBubble
              role="assistant"
              content={streamContent}
              citations={streamCitations}
              streaming
            />
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={handleStop}
        streaming={streaming}
      />
    </div>
  );
}

export function NewChatRedirect() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    conversationsApi
      .create()
      .then((conv) => {
        if (cancelled) return;
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        router.replace(`/chat/${conv.id}`);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to start chat');
      });

    return () => {
      cancelled = true;
    };
  }, [router, queryClient]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/documents')}
          className="text-accent text-sm hover:underline"
        >
          Go to Documents
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center text-muted">
      Starting new chat...
    </div>
  );
}
