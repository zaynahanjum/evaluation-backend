import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';

/**
 * GET /evaluator/rounds/:roundId/teams
 * Returns the teams assigned to this evaluator's panel in the given round,
 * annotated with scoring status (confirmed / not-confirmed / not-started).
 * Teams not yet scored are listed first (for the "red at the top" feature).
 */
export async function getMyTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evaluatorId = req.user!.id;
    const roundId = req.params['roundId'] as string;

    // Verify the evaluator has a panel in this round
    const panelMembership = await prisma.panelMember.findFirst({
      where: {
        userId: evaluatorId,
        panel: { roundId },
      },
      include: {
        panel: {
          include: {
            round: { select: { id: true, name: true, status: true } },
            teams: { include: { team: { select: { id: true, name: true } } } },
          },
        },
      },
    }) as (Awaited<ReturnType<typeof prisma.panelMember.findFirst>> & {
      panel: {
        id: string;
        name: string;
        round: { id: string; name: string; status: string };
        teams: { team: { id: string; name: string } }[];
      };
    }) | null;

    if (!panelMembership) {
      next(new AppError(403, 'You are not assigned to any panel in this round.'));
      return;
    }

    if (panelMembership.panel.round.status !== 'ACTIVE') {
      next(new AppError(403, 'This round is not currently active.'));
      return;
    }

    // Load existing evaluations for this evaluator in this round
    const existingEvaluations = await prisma.evaluatorTeamEvaluation.findMany({
      where: { evaluatorId, roundId },
      include: {
        scores: { include: { criterion: { select: { id: true, name: true, maxScore: true } } } },
      },
    });

    const evaluationMap = new Map(existingEvaluations.map(e => [e.teamId, e]));

    type EvaluationStatus = 'not-started' | 'in-progress' | 'confirmed';

    const teams = panelMembership.panel.teams.map(pt => {
      const evaluation = evaluationMap.get(pt.team.id);
      const evaluationStatus: EvaluationStatus = evaluation
        ? evaluation.isConfirmed ? 'confirmed' : 'in-progress'
        : 'not-started';
      return {
        team: pt.team,
        evaluationStatus,
        evaluation: evaluation
          ? {
              id: evaluation.id,
              note: evaluation.note,
              isConfirmed: evaluation.isConfirmed,
              confirmedAt: evaluation.confirmedAt,
              scores: (evaluation as typeof evaluation & { scores: unknown[] }).scores,
            }
          : null,
      };
    });

    // Sort: not-started first, then in-progress, then confirmed
    const order: Record<EvaluationStatus, number> = { 'not-started': 0, 'in-progress': 1, 'confirmed': 2 };
    teams.sort((a, b) => (order[a.evaluationStatus] ?? 0) - (order[b.evaluationStatus] ?? 0));

    res.json({
      success: true,
      data: {
        round: panelMembership.panel.round,
        panel: { id: panelMembership.panel.id, name: panelMembership.panel.name },
        teams,
      },
    });
  } catch (err) {
    next(err);
  }
}
