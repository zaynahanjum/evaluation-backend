import { z } from 'zod';

const participantSchema = z.object({
  name: z.string().min(1, 'Participant name is required'),
  hotelNo: z.string().optional(),
  roomName: z.string().optional(),
});

export const createTeamSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  name: z.string().min(1, 'Team name is required'),
  participants: z.array(participantSchema).min(1, 'At least one participant is required'),
});

export const updateTeamSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export const updateParticipantSchema = z.object({
  name: z.string().min(1).optional(),
  hotelNo: z.string().optional(),
  roomName: z.string().optional(),
});

export const setTopTeamsSchema = z.object({
  teamIds: z.array(z.string().min(1)).min(1).max(10),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type SetTopTeamsInput = z.infer<typeof setTopTeamsSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
