import { z } from 'zod';

export const citationSchema = z.object({
  documentId: z.string().uuid(),
  chunkId: z.string().uuid(),
  title: z.string(),
  excerpt: z.string(),
  score: z.number(),
  chunkIndex: z.number(),
});

export type CitationSchema = z.infer<typeof citationSchema>;
