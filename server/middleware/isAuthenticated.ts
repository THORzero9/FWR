import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).id || 'unknown';
  if (req.isAuthenticated && req.isAuthenticated()) {
    logger.debug({ requestId, userId: req.user?.id }, "User is authenticated, proceeding to route.");
    return next();
  }
  logger.warn({ requestId, originalUrl: req.originalUrl }, "User is not authenticated. Access denied.");
  res.status(401).json({ message: 'Unauthorized. Please log in to access this resource.' });
}
