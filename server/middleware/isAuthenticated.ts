import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

/**
 * Express middleware that allows access only to authenticated users.
 *
 * If the request is authenticated, passes control to the next middleware or route handler. Otherwise, responds with HTTP 401 Unauthorized and a generic JSON message.
 *
 * @remark
 * Authentication is determined by `req.isAuthenticated()`. The response does not disclose authentication details.
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const requestId = (req as any).id || 'unknown';
  if (req.isAuthenticated && req.isAuthenticated()) {
    logger.debug({ requestId, userId: req.user?.id }, "User is authenticated, proceeding to route.");
    return next();
  }
  logger.warn({ requestId, originalUrl: req.originalUrl }, "User is not authenticated. Access denied.");
  res.status(401).json({ message: 'Unauthorized. Please log in to access this resource.' });
}
