import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';
import type { CreateCriteriaInput, UpdateCriteriaInput } from '../../models/zod/criteria.schema';

// GET /admin/rounds/:roundId/criteria
export async function listCriteria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const criteria = await prisma.evaluationCriteria.findMany({
      where: { roundId: req.params['roundId'] as string },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: criteria });
  } catch (err) {
    next(err);
  }
}

// POST /admin/rounds/:roundId/criteria
export async function createCriteria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const round = await prisma.round.findUnique({ where: { id: req.params['roundId'] as string } });
    if (!round) { next(new AppError(404, 'Round not found.')); return; }

    const { name, description, maxScore } = req.body as CreateCriteriaInput;
    const criterion = await prisma.evaluationCriteria.create({
      data: { name, description: description ?? null, maxScore, roundId: round.id },
    });
    res.status(201).json({ success: true, data: criterion });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/criteria/:id
export async function updateCriteria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, maxScore } = req.body as UpdateCriteriaInput;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData['name'] = name;
    if (description !== undefined) updateData['description'] = description;
    if (maxScore !== undefined) updateData['maxScore'] = maxScore;

    const criterion = await prisma.evaluationCriteria.update({
      where: { id: req.params['id'] as string },
      data: updateData,
    });
    res.json({ success: true, data: criterion });
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/criteria/:id
export async function deleteCriteria(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.evaluationCriteria.delete({ where: { id: req.params['id'] as string } });
    res.json({ success: true, message: 'Criterion deleted.' });
  } catch (err) {
    next(err);
  }
}
