import type { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from '../errors';

/** Parse `data` with a Zod schema, throwing a normalized AppError on failure. */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw AppError.validation('Validation failed', formatZodError(result.error));
  }
  return result.data;
}

function formatZodError(err: ZodError): Array<{ path: string; message: string }> {
  return err.errors.map((e) => ({ path: e.path.join('.'), message: e.message }));
}

/** Express middleware factory: validate req.body / req.query / req.params. */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = validate(schema, req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = validate(schema, req.query);
      (req as unknown as { validatedQuery: T }).validatedQuery = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };
}
