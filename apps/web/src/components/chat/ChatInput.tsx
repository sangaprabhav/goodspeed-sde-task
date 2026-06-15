'use client';

import { useRef, useEffect, useState, KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  streaming?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  streaming,
  disabled,
  placeholder = 'Ask about your documents...',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMultiline, setIsMultiline] = useState(false);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const height = Math.min(el.scrollHeight, 160);
    el.style.height = `${height}px`;
    setIsMultiline(height > 36 || value.includes('\n'));
  }, [value]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !streaming && value.trim()) onSend();
    }
  };

  return (
    <div className="shrink-0 border-t border-white/10 bg-black/40 px-4 pb-4 pt-3 backdrop-blur-xl md:px-8">
      <div
        className={`glass-chat-bar mx-auto flex max-w-4xl gap-3 rounded-2xl px-4 py-3 transition-all focus-within:border-white/20 ${
          isMultiline ? 'items-end' : 'items-center'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          aria-label="Message"
          className="chat-input-field min-h-6 flex-1 resize-none bg-transparent text-sm leading-6 text-white/90 outline-none placeholder:text-muted"
        />
        {streaming ? (
          <button
            type="button"
            onClick={() => onStop?.()}
            aria-label="Stop generating"
            className="glass-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all hover:bg-white/10"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onSend()}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity hover:opacity-85 disabled:bg-white/15 disabled:text-white/30"
          >
            <ArrowUp size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
      <div className="mx-auto mt-2 flex max-w-4xl items-center justify-center gap-3 text-[11px] text-muted">
        <span>Enter to send</span>
        <span aria-hidden="true" className="h-1 w-1 rounded-full bg-white/20" />
        <span>Shift+Enter for a new line</span>
      </div>
    </div>
  );
}
