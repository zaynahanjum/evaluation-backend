import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';
import type { CreatePanelInput, AddPanelMemberInput, AddPanelTeamsInput } from '../../models/zod/panel.schema';

// GET /admin/rounds/:roundId/panels
export async function listPanels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roundId = req.params['roundId'] as string;
    const panels = await prisma.panel.findMany({
      where: { roundId },
      include: {
        members: { include: { user: { select: { id: true, username: true, role: true } } } },
        teams: { include: { team: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: panels });
  } catch (err) {
    next(err);
  }
}

// POST /admin/rounds/:roundId/panels
export async function createPanel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roundId = req.params['roundId'] as string;
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) { next(new AppError(404, 'Round not found.')); return; }

    const { name } = req.body as CreatePanelInput;
    const panel = await prisma.panel.create({
      data: { name, roundId: round.id },
    });
    res.status(201).json({ success: true, data: panel });
  } catch (err) {
    next(err);
  }
}

// GET /admin/panels/:panelId
export async function getPanel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const panelId = req.params['panelId'] as string;
    const panel = await prisma.panel.findUnique({
      where: { id: panelId },
      include: {
        round: true,
        members: { include: { user: { select: { id: true, username: true, role: true } } } },
        teams: {
          include: {
            team: {
              select: {
                id: true, name: true,
                evaluations: {
                  select: { evaluatorId: true, isConfirmed: true },
                },
              },
            },
          },
        },
      },
    });
    if (!panel) { next(new AppError(404, 'Panel not found.')); return; }
    res.json({ success: true, data: panel });
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/panels/:panelId
export async function deletePanel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const panelId = req.params['panelId'] as string;
    await prisma.panel.delete({ where: { id: panelId } });
    res.json({ success: true, message: 'Panel deleted.' });
  } catch (err) {
    next(err);
  }
}

// POST /admin/panels/:panelId/members
export async function addPanelMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const panelId = req.params['panelId'] as string;
    const { userId } = req.body as AddPanelMemberInput;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role === 'ADMIN') {
      next(new AppError(403, 'Evaluator user not found.')); return;
    }
    const member = await prisma.panelMember.create({
      data: { panelId, userId },
      include: { user: { select: { id: true, username: true, role: true } } },
    });
    res.status(201).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/panels/:panelId/members/:userId
export async function removePanelMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const panelId = req.params['panelId'] as string;
    const userId = req.params['userId'] as string;
    await prisma.panelMember.deleteMany({
      where: { panelId, userId },
    });
    res.json({ success: true, message: 'Member removed from panel.' });
  } catch (err) {
    next(err);
  }
}

// POST /admin/panels/:panelId/teams
export async function addPanelTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const panelId = req.params['panelId'] as string;
    const { teamIds } = req.body as AddPanelTeamsInput;
    const data = teamIds.map(teamId => ({ panelId, teamId }));
    await prisma.panelTeam.createMany({ data, skipDuplicates: true });
    res.status(201).json({ success: true, message: `${teamIds.length} team(s) assigned to panel.` });
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/panels/:panelId/teams/:teamId
export async function removePanelTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const panelId = req.params['panelId'] as string;
    const teamId = req.params['teamId'] as string;
    await prisma.panelTeam.deleteMany({
      where: { panelId, teamId },
    });
    res.json({ success: true, message: 'Team removed from panel.' });
  } catch (err) {
    next(err);
  }
}
