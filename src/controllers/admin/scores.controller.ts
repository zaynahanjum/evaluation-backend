import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';
import type { AdminUpdateScoreInput } from '../../models/zod/score.schema';

// GET /admin/rounds/:roundId/scores
// Returns all evaluation sessions (confirmed + unconfirmed) for a round
export async function listRoundScores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const roundId = req.params['roundId'] as string;
    const evaluations = await prisma.evaluatorTeamEvaluation.findMany({
      where: { roundId },
      include: {
        evaluator: { select: { id: true, username: true, role: true } },
        team: { select: { id: true, name: true } },
        scores: { include: { criterion: { select: { id: true, name: true, maxScore: true } } } },
      },
      orderBy: [{ team: { name: 'asc' } }, { evaluator: { username: 'asc' } }],
    });
    res.json({ success: true, data: evaluations });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/scores/:scoreId
export async function updateScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const scoreId = req.params['scoreId'] as string;
    const { value } = req.body as AdminUpdateScoreInput;
    const score = await prisma.score.findUnique({
      where: { id: scoreId },
      include: { criterion: true },
    }) as (Awaited<ReturnType<typeof prisma.score.findUnique>> & {
      criterion: { maxScore: number };
    }) | null;
    if (!score) { next(new AppError(404, 'Score not found.')); return; }

    if (value < 0 || value > score.criterion.maxScore) {
      next(new AppError(400, `Score must be between 0 and ${score.criterion.maxScore}.`));
      return;
    }

    const updated = await prisma.score.update({
      where: { id: score.id },
      data: { value },
      include: { criterion: { select: { id: true, name: true, maxScore: true } } },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/evaluations/:evaluationId/note
export async function updateEvaluationNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evaluationId = req.params['evaluationId'] as string;
    const { note } = req.body as { note: string };
    const evaluation = await prisma.evaluatorTeamEvaluation.update({
      where: { id: evaluationId },
      data: { note },
    });
    res.json({ success: true, data: evaluation });
  } catch (err) {
    next(err);
  }
}
