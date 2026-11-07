import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error('[error]', err?.message || err);
  const status = err.status || err.statusCode || 500;
  const message = err.expose ? err.message : (status < 500 ? err.message : 'Internal server error');
  res.status(status).json({
    error: message,
    code: err.code || undefined,
  });
}
