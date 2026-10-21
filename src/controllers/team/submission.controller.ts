import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';
import type { UpsertSubmissionInput, FinalSubmissionInput } from '../../models/zod/submission.schema';

// GET /team/submission
export async function getSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    const submission = await prisma.submission.findUnique({
      where: { teamId: req.user!.id },
      select: {
        id: true,
        problemStatement: true,
        solution: true,
        driveLink: true,
        deploymentLink: true,
        submittedAt: true,
        updatedAt: true,
      },
    });
    res.json({
      success: true,
      data: {
        submission: submission ?? null,
        submissionLocked: settings?.submissionLocked ?? false,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /team/submission (create or update problemStatement/solution)
export async function upsertSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    if (settings?.submissionLocked) {
      next(new AppError(403, 'Submissions are currently locked by admin.')); return;
    }

    const { problemStatement, solution } = req.body as UpsertSubmissionInput;
    const submission = await prisma.submission.upsert({
      where: { teamId: req.user!.id },
      create: { teamId: req.user!.id, problemStatement: problemStatement ?? null, solution: solution ?? null },
      update: { problemStatement: problemStatement ?? null, solution: solution ?? null, updatedAt: new Date() },
    });
    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
}

// POST /team/submission/final (submit drive link + optional deployment link)
export async function finalSubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    if (settings?.submissionLocked) {
      next(new AppError(403, 'Final submissions are currently closed by admin.')); return;
    }

    const { driveLink, deploymentLink } = req.body as FinalSubmissionInput;
    const submission = await prisma.submission.upsert({
      where: { teamId: req.user!.id },
      create: {
        teamId: req.user!.id,
        driveLink,
        deploymentLink: deploymentLink ?? null,
        submittedAt: new Date(),
      },
      update: {
        driveLink,
        deploymentLink: deploymentLink ?? null,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    });
    res.json({ success: true, data: submission });
  } catch (err) {
    next(err);
  }
}
