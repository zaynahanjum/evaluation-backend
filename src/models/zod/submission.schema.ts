import { z } from 'zod';

const MAX_WORDS = 250;

const wordCountRefine = (val: string) =>
  val.trim().split(/\s+/).filter(Boolean).length <= MAX_WORDS;

// Used at the start of the hackathon (problem statement & solution)
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

// Used for final submission (drive link + optional deployment link)
export const finalSubmissionSchema = z.object({
  driveLink: z.string().url({ message: 'driveLink must be a valid URL' }),
  deploymentLink: z
    .string()
    .url({ message: 'deploymentLink must be a valid URL' })
    .optional(),
});

export const submissionLockSchema = z.object({
  locked: z.boolean(),
});

export type UpsertSubmissionInput = z.infer<typeof upsertSubmissionSchema>;
export type FinalSubmissionInput = z.infer<typeof finalSubmissionSchema>;
export type SubmissionLockInput = z.infer<typeof submissionLockSchema>;
