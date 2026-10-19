import { z } from 'zod';

export const createCriteriaSchema = z.object({
  name: z.string().min(1, 'Criterion name is required'),
  description: z.string().optional(),
  maxScore: z.number().positive('Max score must be a positive number'),
});

export const updateCriteriaSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  maxScore: z.number().positive().optional(),
});

export type CreateCriteriaInput = z.infer<typeof createCriteriaSchema>;
export type UpdateCriteriaInput = z.infer<typeof updateCriteriaSchema>;
