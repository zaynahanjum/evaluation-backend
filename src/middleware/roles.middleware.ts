import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.middleware';

type Role = 'ADMIN' | 'MENTOR' | 'JUDGE' | 'TEAM';

/**
 * Factory: creates middleware that allows only the specified role(s).
 * Must be used after `authenticate`.
 */
function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new AppError(401, 'Not authenticated.'));
      return;
    }
    if (!roles.includes(user.role)) {
      next(new AppError(403, 'You do not have permission to access this resource.'));
      return;
    }
    next();
  };
}

/** Only ADMIN */
export const requireAdmin = requireRole('ADMIN');

/** Only MENTOR or JUDGE */
export const requireEvaluator = requireRole('MENTOR', 'JUDGE');

/** Only TEAM */
export const requireTeam = requireRole('TEAM');

/** Any authenticated user */
export const requireAny = requireRole('ADMIN', 'MENTOR', 'JUDGE', 'TEAM');
