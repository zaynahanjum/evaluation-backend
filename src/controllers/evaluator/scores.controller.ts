import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';
import type {
  SubmitScoresInput,
  PatchScoresInput,
  EvaluatorUpdateScoreInput,
} from '../../models/zod/score.schema';

/**
 * POST /evaluator/rounds/:roundId/teams/:teamId/scores
 * Creates or updates an evaluation session (upsert), optionally confirming it.
 * Validates: round is ACTIVE, evaluator has panel assignment, team is in that panel.
 */
export async function submitScores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evaluatorId = req.user!.id;
    const roundId = req.params['roundId'] as string;
    const teamId = req.params['teamId'] as string;
    const { scores, note, confirm } = req.body as SubmitScoresInput;

    // 1. Verify round is active
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) { next(new AppError(404, 'Round not found.')); return; }
    if (round.status !== 'ACTIVE') {
      next(new AppError(403, 'Scores can only be submitted for active rounds.')); return;
    }

    // 2. Verify evaluator is assigned to a panel in this round
    const memberships = await prisma.panelMember.findMany({
      where: { userId: evaluatorId, panel: { roundId } },
      include: { panel: { include: { teams: true } } },
    });
    if (!memberships || memberships.length === 0) {
      next(new AppError(403, 'You are not assigned to any panel in this round.')); return;
    }

    // 3. Verify team is in the evaluator's panel
    const teamInPanel = memberships.some(m => m.panel.teams.some(pt => pt.teamId === teamId));
    if (!teamInPanel) {
      next(new AppError(403, 'This team is not in your assigned panel.')); return;
    }

    // 4. Validate all criterion IDs belong to this round and scores are within range
    const criteria = await prisma.evaluationCriteria.findMany({ where: { roundId } });
    const criteriaMap = new Map(criteria.map(c => [c.id, c]));

    for (const item of scores) {
      const criterion = criteriaMap.get(item.criterionId);
      if (!criterion) {
        next(new AppError(400, `Criterion ${item.criterionId} does not belong to this round.`)); return;
      }
      if (item.value < 0 || item.value > criterion.maxScore) {
        next(new AppError(400, `Score for "${criterion.name}" must be between 0 and ${criterion.maxScore}.`));
        return;
      }
    }

    // 5. Upsert the evaluation session
    const now = new Date();
    const evaluation = await prisma.evaluatorTeamEvaluation.upsert({
      where: { evaluatorId_teamId_roundId: { evaluatorId, teamId, roundId } },
      create: {
        evaluatorId,
        teamId,
        roundId,
        note: note ?? null,
        isConfirmed: confirm ?? false,
        confirmedAt: confirm ? now : null,
      },
      update: {
        note: note ?? null,
        isConfirmed: confirm ?? false,
        confirmedAt: confirm ? now : null,
        updatedAt: now,
      },
    });

    // 6. Upsert each score
    await Promise.all(
      scores.map(item =>
        prisma.score.upsert({
          where: { criterionId_evaluationId: { criterionId: item.criterionId, evaluationId: evaluation.id } },
          create: { criterionId: item.criterionId, evaluationId: evaluation.id, value: item.value },
          update: { value: item.value, updatedAt: now },
        }),
      ),
    );

    // 7. Return full evaluation with scores
    const full = await prisma.evaluatorTeamEvaluation.findUnique({
      where: { id: evaluation.id },
      include: {
        scores: { include: { criterion: { select: { id: true, name: true, maxScore: true } } } },
      },
    });

    res.json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /evaluator/rounds/:roundId/teams/:teamId/scores
 * Partially updates an evaluation session (scores, note, and/or confirm status).
 * Validates: round is ACTIVE, evaluator has panel assignment, team is in that panel.
 */
export async function patchScores(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evaluatorId = req.user!.id;
    const roundId = req.params['roundId'] as string;
    const teamId = req.params['teamId'] as string;
    const { scores, note, confirm } = req.body as PatchScoresInput;

    // 1. Verify round is active
    const round = await prisma.round.findUnique({ where: { id: roundId } });
    if (!round) { next(new AppError(404, 'Round not found.')); return; }
    if (round.status !== 'ACTIVE') {
      next(new AppError(403, 'Scores can only be updated for active rounds.')); return;
    }

    // 2. Verify evaluator is assigned to a panel in this round
    const memberships = await prisma.panelMember.findMany({
      where: { userId: evaluatorId, panel: { roundId } },
      include: { panel: { include: { teams: true } } },
    });
    if (!memberships || memberships.length === 0) {
      next(new AppError(403, 'You are not assigned to any panel in this round.')); return;
    }

    // 3. Verify team is in the evaluator's panel
    const teamInPanel = memberships.some(m => m.panel.teams.some(pt => pt.teamId === teamId));
    if (!teamInPanel) {
      next(new AppError(403, 'This team is not in your assigned panel.')); return;
    }

    // 4. Validate scores if provided
    if (scores && scores.length > 0) {
      const criteria = await prisma.evaluationCriteria.findMany({ where: { roundId } });
      const criteriaMap = new Map(criteria.map(c => [c.id, c]));

      for (const item of scores) {
        const criterion = criteriaMap.get(item.criterionId);
        if (!criterion) {
          next(new AppError(400, `Criterion ${item.criterionId} does not belong to this round.`)); return;
        }
        if (item.value < 0 || item.value > criterion.maxScore) {
          next(new AppError(400, `Score for "${criterion.name}" must be between 0 and ${criterion.maxScore}.`));
          return;
        }
      }
    }

    // 5. Update or upsert evaluation session
    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };
    if (note !== undefined) updateData['note'] = note;
    if (confirm !== undefined) {
      updateData['isConfirmed'] = confirm;
      updateData['confirmedAt'] = confirm ? now : null;
    }

    const evaluation = await prisma.evaluatorTeamEvaluation.upsert({
      where: { evaluatorId_teamId_roundId: { evaluatorId, teamId, roundId } },
      create: {
        evaluatorId,
        teamId,
        roundId,
        note: note ?? null,
        isConfirmed: confirm ?? false,
        confirmedAt: confirm ? now : null,
      },
      update: updateData,
    });

    // 6. Upsert scores if provided
    if (scores && scores.length > 0) {
      await Promise.all(
        scores.map(item =>
          prisma.score.upsert({
            where: { criterionId_evaluationId: { criterionId: item.criterionId, evaluationId: evaluation.id } },
            create: { criterionId: item.criterionId, evaluationId: evaluation.id, value: item.value },
            update: { value: item.value, updatedAt: now },
          }),
        ),
      );
    }

    // 7. Return full evaluation with scores
    const full = await prisma.evaluatorTeamEvaluation.findUnique({
      where: { id: evaluation.id },
      include: {
        scores: { include: { criterion: { select: { id: true, name: true, maxScore: true } } } },
      },
    });

    res.json({ success: true, data: full });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /evaluator/scores/:scoreId
 * Updates a single score item by ID.
 * Validates ownership by evaluator and that the round is ACTIVE.
 */
export async function updateScore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evaluatorId = req.user!.id;
    const scoreId = req.params['scoreId'] as string;
    const { value } = req.body as EvaluatorUpdateScoreInput;

    const score = await prisma.score.findUnique({
      where: { id: scoreId },
      include: {
        criterion: true,
        evaluation: {
          include: { round: true },
        },
      },
    });

    if (!score) {
      next(new AppError(404, 'Score not found.'));
      return;
    }

    // Ensure this score belongs to the logged-in evaluator
    if (score.evaluation.evaluatorId !== evaluatorId) {
      next(new AppError(403, 'You are not authorized to update this score.'));
      return;
    }

    // Ensure the associated round is still ACTIVE
    if (score.evaluation.round.status !== 'ACTIVE') {
      next(new AppError(403, 'Scores can only be updated for active rounds.'));
      return;
    }

    // Validate score bounds
    if (value < 0 || value > score.criterion.maxScore) {
      next(new AppError(400, `Score must be between 0 and ${score.criterion.maxScore}.`));
      return;
    }

    const updated = await prisma.score.update({
      where: { id: score.id },
      data: { value, updatedAt: new Date() },
      include: { criterion: { select: { id: true, name: true, maxScore: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
