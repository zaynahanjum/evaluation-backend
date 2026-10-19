import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from './error.middleware';

type ValidateTarget = 'body' | 'params' | 'query';

/**
 * Returns an Express middleware that validates req[target] against the given Zod schema.
 * On failure, passes an AppError(400) with Zod's formatted messages to next().
 */
export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const messages = result.error.issues.map((e) => `${e.path.map(String).join('.')}: ${e.message}`).join('; ');
      next(new AppError(400, messages));
      return;
    }
    // Replace parsed target with coerced/transformed values
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
