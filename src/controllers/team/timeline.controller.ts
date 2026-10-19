import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';

// GET /team/timeline
// Returns only events marked visibleToTeams = true, sorted chronologically
export async function getTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await prisma.timelineEvent.findMany({
      where: { visibleToTeams: true },
      orderBy: { scheduledAt: 'asc' },
      select: { id: true, title: true, description: true, scheduledAt: true },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}
