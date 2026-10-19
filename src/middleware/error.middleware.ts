import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '../services/prisma.service';

// ─── Custom Error Class ──────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Global Error Handler Middleware ─────────────────────────────────────────

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ success: false, message: err.message });
    return;
  }

  // Database unreachable / connection errors (503 Service Unavailable)
  if (
    err instanceof Prisma.PrismaClientInitializationError ||
    (err instanceof Error && err.name === 'PrismaClientInitializationError') ||
    (err instanceof Prisma.PrismaClientKnownRequestError &&
      ['P1000', 'P1001', 'P1002', 'P1008', 'P1011', 'P1017'].includes(err.code)) ||
    (typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      typeof (err as { code: unknown }).code === 'string' &&
      ['P1000', 'P1001', 'P1002', 'P1008', 'P1011', 'P1017'].includes((err as { code: string }).code)) ||
    (err instanceof Error &&
      (err.message.includes("Can't reach database server") ||
        err.message.includes('DatabaseNotReachable') ||
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('ENETUNREACH') ||
        err.message.includes('Connection terminated unexpectedly')))
  ) {
    console.error('[Database Unreachable]', err instanceof Error ? err.message : err);
    res.status(503).json({
      success: false,
      message: 'Database is temporarily unreachable. Please try again later.',
    });
    return;
  }

  // Prisma known errors
  if (
    err instanceof Prisma.PrismaClientKnownRequestError ||
    (err instanceof Error && err.name === 'PrismaClientKnownRequestError')
  ) {
    const prismaError = err as Prisma.PrismaClientKnownRequestError;
    switch (prismaError.code) {
      case 'P2002':
        res.status(409).json({ success: false, message: 'A record with this value already exists.' });
        return;
      case 'P2025':
        res.status(404).json({ success: false, message: 'Record not found.' });
        return;
      case 'P2003':
        res.status(400).json({ success: false, message: 'Related record not found.' });
        return;
      default:
        break;
    }
  }

  // Prisma validation errors
  if (
    err instanceof Prisma.PrismaClientValidationError ||
    (err instanceof Error && err.name === 'PrismaClientValidationError')
  ) {
    res.status(400).json({ success: false, message: 'Invalid database query parameters.' });
    return;
  }

  // Validation errors from Zod (passed via next(error))
  if (err instanceof Error && err.name === 'ZodError') {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // JWT errors
  if (err instanceof Error && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    return;
  }

  // Unexpected errors
  console.error('[Unhandled Error]', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
}

// ─── 404 Handler ─────────────────────────────────────────────────────────────

export function notFoundMiddleware(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Route not found.' });
}
