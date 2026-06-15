import { z } from 'zod';
import { MAX_DOC_SIZE, MAX_TITLE_LENGTH } from '../constants/limits';

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(MAX_TITLE_LENGTH),
  content: z.string().max(MAX_DOC_SIZE).default(''),
  tags: z.array(z.string().max(50)).max(20).default([]),
});

export const updateDocumentSchema = createDocumentSchema.partial();

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
