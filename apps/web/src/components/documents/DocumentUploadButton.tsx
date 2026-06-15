'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { documentsApi, toErrorMessage } from '@/lib/api';

interface DocumentUploadButtonProps {
  onStatus?: (message: string, isError?: boolean) => void;
}

export function DocumentUploadButton({ onStatus }: DocumentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    setProgress(files.length > 1 ? `0 / ${files.length}` : '');
    onStatus?.('');

    try {
      if (files.length === 1) {
        const doc = await documentsApi.upload(files[0]!);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        router.push(`/documents/${doc.id}`);
        return;
      }

      const { results: uploaded, errors } = await documentsApi.uploadMany(files, (done, total) => {
        setProgress(`${done} / ${total}`);
      });
      queryClient.invalidateQueries({ queryKey: ['documents'] });

      if (uploaded.length && !errors.length) {
        onStatus?.(`Uploaded ${uploaded.length} documents`);
      } else if (uploaded.length && errors.length) {
        onStatus?.(
          `Uploaded ${uploaded.length}, failed ${errors.length}: ${errors.map((e) => e.filename).join(', ')}`,
          true,
        );
      } else {
        onStatus?.(errors[0]?.message ?? 'Upload failed', true);
      }
    } catch (err) {
      onStatus?.(toErrorMessage(err), true);
    } finally {
      setUploading(false);
      setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const label =
    uploading && progress
      ? `Uploading ${progress}`
      : uploading
        ? 'Uploading...'
        : 'Upload';

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.txt,application/pdf,text/plain"
        className="hidden"
        onChange={(e) => void handleChange(e)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="glass-pill flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm text-muted transition-all hover:text-white disabled:opacity-50"
      >
        <Upload size={14} className={uploading ? 'animate-pulse' : ''} />
        {label}
      </button>
    </div>
  );
}
