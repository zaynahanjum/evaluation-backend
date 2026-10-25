import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';

// GET /evaluator/me
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, username: true, role: true,
        panelMembers: {
          include: {
            panel: {
              include: {
                round: {
                  include: {
                    criteria: { select: { id: true, name: true, description: true, maxScore: true } },
                  },
                },
                teams: {
                  select: {
                    team: {
                      select: {
                        id: true, name: true,
                        submission: { select: { problemStatement: true, solution: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// GET /evaluator/rounds  — only ACTIVE rounds where this evaluator has a panel assignment
export async function getMyRounds(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const panelMemberships = await prisma.panelMember.findMany({
      where: { userId: req.user!.id },
      include: {
        panel: {
          include: {
            round: {
              include: {
                criteria: { select: { id: true, name: true, description: true, maxScore: true } },
              },
            },
            teams: {
              select: {
                team: {
                  select: {
                    id: true, name: true,
                    submission: { select: { problemStatement: true, solution: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Filter to only active rounds
    const activeRounds = panelMemberships
      .filter(pm => pm.panel.round.status === 'ACTIVE')
      .map(pm => ({
        roundId: pm.panel.round.id,
        roundName: pm.panel.round.name,
        roundType: pm.panel.round.type,
        roundNumber: pm.panel.round.roundNumber,
        criteria: pm.panel.round.criteria,
        panelId: pm.panel.id,
        panelName: pm.panel.name,
        teams: pm.panel.teams.map(pt => ({
          id: pt.team.id,
          name: pt.team.name,
          problemStatement: pt.team.submission?.problemStatement ?? null,
          solution: pt.team.submission?.solution ?? null,
        })),
      }));

    res.json({ success: true, data: activeRounds });
  } catch (err) {
    next(err);
  }
}
