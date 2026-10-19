import { z } from 'zod';

export const createRoundSchema = z.object({
  name: z.string().min(1, 'Round name is required'),
  type: z.enum(['MENTORING', 'JUDGING']),
  roundNumber: z.number().int().positive(),
});

export const updateRoundSchema = z.object({
  name: z.string().min(1).optional(),
});

export type CreateRoundInput = z.infer<typeof createRoundSchema>;
export type UpdateRoundInput = z.infer<typeof updateRoundSchema>;
