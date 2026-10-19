import type { Request, Response, NextFunction } from 'express';
import { calculateRoundResults } from '../../services/score.service';
import { AppError } from '../../middleware/error.middleware';
import { prisma } from '../../services/prisma.service';

// GET /admin/rounds/:roundId/results
// Returns computed avg + total per team for the round
export async function getRoundResults(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const round = await prisma.round.findUnique({ where: { id: req.params['roundId'] as string } });
    if (!round) { next(new AppError(404, 'Round not found.')); return; }

    const results = await calculateRoundResults(round.id);
    res.json({
      success: true,
      data: {
        round: { id: round.id, name: round.name, type: round.type, status: round.status },
        results,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /admin/dashboard
export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      totalTeams,
      totalMentors,
      totalJudges,
      activeRounds,
      topTeams,
      settings,
    ] = await Promise.all([
      prisma.team.count(),
      prisma.user.count({ where: { role: 'MENTOR' } }),
      prisma.user.count({ where: { role: 'JUDGE' } }),
      prisma.round.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, type: true } }),
      prisma.team.findMany({ where: { isTopTen: true }, select: { id: true, name: true } }),
      prisma.appSettings.findUnique({ where: { id: 'singleton' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalTeams,
        totalMentors,
        totalJudges,
        activeRounds,
        topTeams,
        submissionLocked: settings?.submissionLocked ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
}
