import { z } from 'zod';

export const createPanelSchema = z.object({
  name: z.string().min(1, 'Panel name is required'),
});

export const addPanelMemberSchema = z.object({
  userId: z.string().min(1, 'Invalid user ID'),
});

export const addPanelTeamsSchema = z.object({
  teamIds: z.array(z.string().min(1)).min(1, 'At least one team ID is required'),
});

export type CreatePanelInput = z.infer<typeof createPanelSchema>;
export type AddPanelMemberInput = z.infer<typeof addPanelMemberSchema>;
export type AddPanelTeamsInput = z.infer<typeof addPanelTeamsSchema>;
