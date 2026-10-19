import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { verifyPassword, hashPassword } from '../../services/auth.service';
import { AppError } from '../../middleware/error.middleware';
import type { ChangePasswordInput } from '../../models/zod/team.schema';

// GET /team/me
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, username: true, isTopTen: true, mustChangePassword: true,
        participants: { select: { id: true, name: true, hotelNo: true, roomName: true } },
      },
    });
    if (!team) { next(new AppError(404, 'Team not found.')); return; }
    res.json({ success: true, data: team });
  } catch (err) {
    next(err);
  }
}

// POST /team/auth/change-password
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.user!.id } });
    if (!team) { next(new AppError(404, 'Team not found.')); return; }

    const { currentPassword, newPassword } = req.body as ChangePasswordInput;
    const valid = await verifyPassword(currentPassword, team.passwordHash);
    if (!valid) {
      next(new AppError(401, 'Current password is incorrect.')); return;
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.team.update({
      where: { id: team.id },
      data: { passwordHash, mustChangePassword: false },
    });

    // Invalidate all existing refresh tokens for this team
    await prisma.refreshToken.deleteMany({ where: { teamId: team.id } });

    res.json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
}
