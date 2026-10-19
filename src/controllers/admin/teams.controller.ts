import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { hashPassword } from '../../services/auth.service';
import { AppError } from '../../middleware/error.middleware';
import type { CreateTeamInput, UpdateTeamInput, SetTopTeamsInput } from '../../models/zod/team.schema';

// GET /admin/teams
export async function listTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true, name: true, username: true, isTopTen: true,
        isActive: true, createdAt: true,
        participants: { select: { id: true, name: true, hotelNo: true, roomName: true } },
        _count: { select: { evaluations: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: teams });
  } catch (err) {
    next(err);
  }
}

// POST /admin/teams
export async function createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password, name, participants } = req.body as CreateTeamInput;
    const passwordHash = await hashPassword(password);
    const team = await prisma.team.create({
      data: {
        username,
        passwordHash,
        name,
        participants: {
          create: participants.map(p => ({
            name: p.name,
            hotelNo: p.hotelNo ?? null,
            roomName: p.roomName ?? null,
          })),
        },
      },
      select: {
        id: true, name: true, username: true, isActive: true, createdAt: true,
        participants: { select: { id: true, name: true, hotelNo: true, roomName: true } },
      },
    });
    res.status(201).json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

// GET /admin/teams/:id
export async function getTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params['id'] as string },
      select: {
        id: true, name: true, username: true, isTopTen: true, isActive: true, createdAt: true,
        participants: { select: { id: true, name: true, hotelNo: true, roomName: true } },
        submission: { select: { id: true, problemStatement: true, solution: true, updatedAt: true } },
        panelTeams: {
          select: {
            panel: {
              select: {
                id: true, name: true,
                round: { select: { id: true, name: true, type: true, status: true } },
              },
            },
          },
        },
      },
    });
    if (!team) { next(new AppError(404, 'Team not found.')); return; }
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/teams/:id
export async function updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, name, isActive } = req.body as UpdateTeamInput;
    const updateData: Record<string, unknown> = {};
    if (username !== undefined) updateData['username'] = username;
    if (name !== undefined) updateData['name'] = name;
    if (isActive !== undefined) updateData['isActive'] = isActive;

    const team = await prisma.team.update({
      where: { id: req.params['id'] as string },
      data: updateData,
      select: { id: true, name: true, username: true, isActive: true },
    });
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/teams/:id
export async function deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.team.delete({ where: { id: req.params['id'] as string } });
    res.json({ success: true, message: 'Team deleted.' });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/teams/:id/participant/:participantId
export async function updateParticipant(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, hotelNo, roomName } = req.body as { name?: string; hotelNo?: string; roomName?: string };
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData['name'] = name;
    if (hotelNo !== undefined) updateData['hotelNo'] = hotelNo;
    if (roomName !== undefined) updateData['roomName'] = roomName;

    const participant = await prisma.participant.update({
      where: { id: req.params['participantId'] as string, teamId: req.params['id'] as string },
      data: updateData,
    });
    res.json({ success: true, data: participant });
  } catch (err) {
    next(err);
  }
}

// POST /admin/teams/top10
export async function setTopTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { teamIds } = req.body as SetTopTeamsInput;

    // Clear all top-10 flags, then set only the selected ones
    await prisma.team.updateMany({ data: { isTopTen: false } });
    await prisma.team.updateMany({ where: { id: { in: teamIds } }, data: { isTopTen: true } });

    res.json({ success: true, message: `${teamIds.length} team(s) marked as top 10.` });
  } catch (err) {
    next(err);
  }
}
