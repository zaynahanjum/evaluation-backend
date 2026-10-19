import { z } from 'zod';

const MAX_WORDS = 250;

const wordCountRefine = (val: string) =>
  val.trim().split(/\s+/).filter(Boolean).length <= MAX_WORDS;

const scoreItemSchema = z.object({
  criterionId: z.string().min(1, 'Criterion ID is required'),
  value: z.number({ error: 'Score value is required' }),
});

export const submitScoresSchema = z.object({
  scores: z.array(scoreItemSchema).min(1, 'At least one score is required'),
  note: z
    .string()
    .refine(wordCountRefine, { message: `Note must be ${MAX_WORDS} words or fewer` })
    .optional(),
  confirm: z.boolean().default(false),
});

export const patchScoresSchema = z.object({
  scores: z.array(scoreItemSchema).optional(),
  note: z
    .string()
    .refine(wordCountRefine, { message: `Note must be ${MAX_WORDS} words or fewer` })
    .optional(),
  confirm: z.boolean().optional(),
});

export const adminUpdateScoreSchema = z.object({
  value: z.number(),
});

export const evaluatorUpdateScoreSchema = z.object({
  value: z.number(),
});

export type SubmitScoresInput = z.infer<typeof submitScoresSchema>;
export type PatchScoresInput = z.infer<typeof patchScoresSchema>;
export type AdminUpdateScoreInput = z.infer<typeof adminUpdateScoreSchema>;
export type EvaluatorUpdateScoreInput = z.infer<typeof evaluatorUpdateScoreSchema>;
