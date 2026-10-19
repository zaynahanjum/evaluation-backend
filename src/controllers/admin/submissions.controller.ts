import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import type { SubmissionLockInput } from '../../models/zod/submission.schema';

// GET /admin/submissions
export async function listSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const submissions = await prisma.submission.findMany({
      include: { team: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    res.json({
      success: true,
      data: { submissionLocked: settings?.submissionLocked ?? false, submissions },
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/submissions/lock
export async function setSubmissionLock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { locked } = req.body as SubmissionLockInput;
    await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', submissionLocked: locked, updatedAt: new Date() },
      update: { submissionLocked: locked, updatedAt: new Date() },
    });
    res.json({ success: true, message: `Submissions are now ${locked ? 'locked' : 'unlocked'}.` });
  } catch (err) {
    next(err);
  }
}
