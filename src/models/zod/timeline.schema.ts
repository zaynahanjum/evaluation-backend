import { z } from 'zod';

export const createTimelineSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  scheduledAt: z.string().datetime({ message: 'scheduledAt must be an ISO 8601 datetime' }),
  visibleToTeams: z.boolean().default(true),
});

export const updateTimelineSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  visibleToTeams: z.boolean().optional(),
});

export type CreateTimelineInput = z.infer<typeof createTimelineSchema>;
export type UpdateTimelineInput = z.infer<typeof updateTimelineSchema>;
