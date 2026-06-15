import { z } from 'zod';
import { isValidChatModel, isValidEmbeddingModel } from '../constants/ai-models';

export const updateAISettingsSchema = z.object({
  chatModel: z
    .string()
    .refine(isValidChatModel, { message: 'Invalid chat model' })
    .optional(),
  embeddingModel: z
    .string()
    .refine(isValidEmbeddingModel, { message: 'Invalid embedding model' })
    .optional(),
});

export type UpdateAISettingsInput = z.infer<typeof updateAISettingsSchema>;
