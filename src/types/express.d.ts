import type { Request, Response, NextFunction } from 'express';

// Extend Express Request to carry decoded token payload after auth middleware
declare global {
  namespace Express {
    interface Request {
      /** Populated by auth middleware after JWT verification */
      user?: {
        /** userId for staff, teamId for teams */
        id: string;
        role: 'ADMIN' | 'MENTOR' | 'JUDGE' | 'TEAM';
        type: 'staff' | 'team';
      };
    }
  }
}

export {};
