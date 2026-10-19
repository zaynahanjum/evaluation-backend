import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { hashPassword } from '../../services/auth.service';
import { AppError } from '../../middleware/error.middleware';
import type { CreateUserInput, UpdateUserInput } from '../../models/zod/user.schema';

// GET /admin/users
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role } = req.query;
    const roleFilter = role === 'MENTOR' ? 'MENTOR' as const : role === 'JUDGE' ? 'JUDGE' as const : undefined;
    const users = await prisma.user.findMany({
      where: {
        ...(roleFilter !== undefined ? { role: roleFilter } : {}),
        NOT: { role: 'ADMIN' },
      },
      select: {
        id: true, username: true, role: true, isActive: true,
        mustChangePassword: true, createdAt: true,
        panelMembers: { select: { panel: { select: { id: true, name: true, round: { select: { id: true, name: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

// POST /admin/users
export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password, role } = req.body as CreateUserInput;
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { username, passwordHash, role },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// GET /admin/users/:id
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params['id'] as string },
      select: {
        id: true, username: true, role: true, isActive: true,
        mustChangePassword: true, createdAt: true,
        panelMembers: {
          select: {
            panel: {
              select: {
                id: true, name: true,
                round: { select: { id: true, name: true, type: true, status: true } },
                teams: { select: { team: { select: { id: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!user) { next(new AppError(404, 'User not found.')); return; }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/users/:id
export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password, isActive, mustChangePassword } = req.body as UpdateUserInput;
    const updateData: Record<string, unknown> = {};
    if (username !== undefined) updateData['username'] = username;
    if (password !== undefined) updateData['passwordHash'] = await hashPassword(password);
    if (isActive !== undefined) updateData['isActive'] = isActive;
    if (mustChangePassword !== undefined) updateData['mustChangePassword'] = mustChangePassword;

    const user = await prisma.user.update({
      where: { id: req.params['id'] as string },
      data: updateData,
      select: { id: true, username: true, role: true, isActive: true, mustChangePassword: true },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/users/:id
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.user.delete({ where: { id: req.params['id'] as string } });
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
}
