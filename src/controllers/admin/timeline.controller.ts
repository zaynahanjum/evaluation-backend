import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../services/prisma.service';
import { AppError } from '../../middleware/error.middleware';
import type { CreateTimelineInput, UpdateTimelineInput } from '../../models/zod/timeline.schema';

// GET /admin/timeline
export async function listTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const events = await prisma.timelineEvent.findMany({
      orderBy: { scheduledAt: 'asc' },
    });
    res.json({ success: true, data: events });
  } catch (err) {
    next(err);
  }
}

// POST /admin/timeline
export async function createTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, scheduledAt, visibleToTeams } = req.body as CreateTimelineInput;
    const event = await prisma.timelineEvent.create({
      data: { title, description: description ?? null, scheduledAt: new Date(scheduledAt), visibleToTeams },
    });
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

// PATCH /admin/timeline/:id
export async function updateTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, scheduledAt, visibleToTeams } = req.body as UpdateTimelineInput;
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData['title'] = title;
    if (description !== undefined) updateData['description'] = description;
    if (scheduledAt !== undefined) updateData['scheduledAt'] = new Date(scheduledAt);
    if (visibleToTeams !== undefined) updateData['visibleToTeams'] = visibleToTeams;

    const event = await prisma.timelineEvent.update({
      where: { id: req.params['id'] as string },
      data: updateData,
    });
    res.json({ success: true, data: event });
  } catch (err) {
    next(err);
  }
}

// DELETE /admin/timeline/:id
export async function deleteTimeline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.timelineEvent.delete({ where: { id: req.params['id'] as string } });
    res.json({ success: true, message: 'Timeline event deleted.' });
  } catch (err) {
    next(err);
  }
}
