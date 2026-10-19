import { z } from 'zod';

const MAX_WORDS = 250;

const wordCountRefine = (val: string) =>
  val.trim().split(/\s+/).filter(Boolean).length <= MAX_WORDS;

export const upsertSubmissionSchema = z.object({
  problemStatement: z
    .string()
    .refine(wordCountRefine, { message: `Problem statement must be ${MAX_WORDS} words or fewer` })
    .optional(),
  solution: z
    .string()
    .refine(wordCountRefine, { message: `Solution must be ${MAX_WORDS} words or fewer` })
    .optional(),
});

export const submissionLockSchema = z.object({
  locked: z.boolean(),
});

export type UpsertSubmissionInput = z.infer<typeof upsertSubmissionSchema>;
export type SubmissionLockInput = z.infer<typeof submissionLockSchema>;
