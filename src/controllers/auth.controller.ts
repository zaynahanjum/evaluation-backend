import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.service';
import {
  verifyPassword,
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  refreshTokenExpiryDate,
  type TokenPayload,
} from '../services/auth.service';
import { AppError } from '../middleware/error.middleware';
import type { LoginInput, RefreshInput } from '../models/zod/auth.schema';

// ─── POST /auth/login ────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body as LoginInput;

    // 1. Try staff users first
    const staffUser = await prisma.user.findUnique({ where: { username } });
    if (staffUser) {
      if (!staffUser.isActive) {
        next(new AppError(403, 'Account is deactivated. Contact admin.'));
        return;
      }
      const valid = await verifyPassword(password, staffUser.passwordHash);
      if (!valid) {
        next(new AppError(401, 'Invalid credentials.'));
        return;
      }

      const role = staffUser.role as 'ADMIN' | 'MENTOR' | 'JUDGE';
      const payload = { sub: staffUser.id, role, type: 'staff' as const };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: staffUser.id,
          expiresAt: refreshTokenExpiryDate(),
        },
      });

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          role,
          type: 'staff',
          user: {
            id: staffUser.id,
            username: staffUser.username,
            role: staffUser.role,
            mustChangePassword: staffUser.mustChangePassword,
          },
        },
      });
      return;
    }

    // 2. Try team users
    const team = await prisma.team.findUnique({ where: { username } });
    if (team) {
      if (!team.isActive) {
        next(new AppError(403, 'Account is deactivated. Contact admin.'));
        return;
      }
      const valid = await verifyPassword(password, team.passwordHash);
      if (!valid) {
        next(new AppError(401, 'Invalid credentials.'));
        return;
      }

      const payload = { sub: team.id, role: 'TEAM' as const, type: 'team' as const };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          teamId: team.id,
          expiresAt: refreshTokenExpiryDate(),
        },
      });

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          role: 'TEAM',
          type: 'team',
          team: {
            id: team.id,
            username: team.username,
            name: team.name,
            mustChangePassword: team.mustChangePassword,
          },
        },
      });
      return;
    }

    next(new AppError(401, 'Invalid credentials.'));
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/refresh ──────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshInput;

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      next(new AppError(401, 'Refresh token is invalid or expired.'));
      return;
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      next(new AppError(401, 'Refresh token is invalid or expired.'));
      return;
    }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    // Extract clean payload without decoded JWT metadata (exp, iat)
    const tokenPayload: TokenPayload =
      payload.type === 'staff'
        ? { sub: payload.sub, role: payload.role, type: 'staff' }
        : { sub: payload.sub, role: 'TEAM', type: 'team' };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.userId,
        teamId: stored.teamId,
        expiresAt: refreshTokenExpiryDate(),
      },
    });

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /auth/logout ───────────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as RefreshInput;
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}
