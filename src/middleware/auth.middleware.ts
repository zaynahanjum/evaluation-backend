import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import { AppError } from './error.middleware';

/**
 * Verifies the Bearer access token from the Authorization header
 * and attaches the decoded payload to req.user.
 * Returns 401 if missing or invalid.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    next(new AppError(401, 'Authorization header missing or malformed.'));
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      type: payload.type,
    };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired access token.'));
  }
}
