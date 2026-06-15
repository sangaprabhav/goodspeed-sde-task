import { z } from 'zod';
import { MAX_MESSAGE_LENGTH } from '../constants/limits';

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
