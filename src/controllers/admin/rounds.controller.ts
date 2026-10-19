import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';
import type { CreateRoundInput } from '../../models/zod/round.schema';

// GET /admin/rounds
export async function listRounds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rounds = await prisma.round.findMany({
      include: {
        _count: { select: { panels: true, criteria: true, evaluations: true } },
      },
      orderBy: [{ type: 'asc' }, { roundNumber: 'asc' }],
    });
    res.json({ success: true, data: rounds });
  } catch (err) {
    next(err);
  }
}

// POST /admin/rounds
export async function createRound(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, type, roundNumber } = req.body as CreateRoundInput;
    const round = await prisma.round.create({
      data: { name, type, roundNumber },
    });
    res.status(201).json({ success: true, data: round });
  } catch (err) {
    next(err);
  }
}

// GET /admin/rounds/:id
export async function getRound(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const round = await prisma.round.findUnique({
      where: { id: req.params['id'] as string },
      include: {
        criteria: { orderBy: { createdAt: 'asc' } },
        panels: {
          include: {
            members: { include: { user: { select: { id: true, username: true, role: true } } } },
            teams: { include: { team: { select: { id: true, name: true } } } },
          },
        },
        _count: { select: { evaluations: true } },
      },
    });
    if (!round) { next(new AppError(404, 'Round not found.')); return; }
    res.json({ success: true, data: round });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/rounds/:id/start
export async function startRound(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const round = await prisma.round.findUnique({ where: { id: req.params['id'] as string } });
    if (!round) { next(new AppError(404, 'Round not found.')); return; }
    if (round.status !== 'PENDING') {
      next(new AppError(400, `Round is already ${round.status.toLowerCase()}.`)); return;
    }
    const updated = await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/rounds/:id/end
export async function endRound(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const round = await prisma.round.findUnique({ where: { id: req.params['id'] as string } });
    if (!round) { next(new AppError(404, 'Round not found.')); return; }
    if (round.status !== 'ACTIVE') {
      next(new AppError(400, `Round is not active (current: ${round.status.toLowerCase()}).`)); return;
    }
    const updated = await prisma.round.update({
      where: { id: round.id },
      data: { status: 'ENDED', endedAt: new Date() },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/rounds/:id
export async function deleteRound(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.round.delete({ where: { id: req.params['id'] as string } });
    res.json({ success: true, message: 'Round deleted.' });
  } catch (err) {
    next(err);
  }
}
