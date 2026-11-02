import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service.js';
import { AppError } from '../../middleware/error.middleware.js';
import type { SubmissionLockInput } from '../../models/zod/submission.schema.js';

// GET /admin/submissions
// Returns all team submissions (all fields) + lock status
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

// GET /admin/submissions/:teamId
// Returns the full submission for a specific team
export async function getTeamSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teamId = req.params['teamId'] as string;
    const submission = await prisma.submission.findUnique({
      where: { teamId },
      include: { team: { select: { id: true, name: true } } },
    });
    if (!submission) {
      next(new AppError(404, 'No submission found for this team.')); return;
    }
    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/submissions/lock
// locked: true  => close submissions
// locked: false => open submissions
export async function setSubmissionLock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { locked } = req.body as SubmissionLockInput;
    await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', submissionLocked: locked, updatedAt: new Date() },
      update: { submissionLocked: locked, updatedAt: new Date() },
    });
    res.json({ success: true, message: `Final submissions are now ${locked ? 'closed' : 'open'}.` });
  } catch (err) {
    next(err);
  }
}
