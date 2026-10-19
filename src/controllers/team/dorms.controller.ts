import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';

// GET /team/dorms
// Returns the dorm/room assignments for all participants of the authenticated team
export async function getDorms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.user!.id },
      select: {
        name: true,
        participants: {
          select: { id: true, name: true, hotelNo: true, roomName: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!team) { next(new AppError(404, 'Team not found.')); return; }
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}
