import { Request, Response, NextFunction } from 'express';
import logger from '../logger';

/**
 * Express middleware that restricts access to authenticated users.
 *
 * If the request is authenticated, proceeds to the next middleware or route handler. Otherwise, responds with HTTP 401 Unauthorized and a JSON message.
 *
 * @remark
 * The request is considered authenticated if `req.isAuthenticated()` returns true. The response includes a generic unauthorized message and does not reveal authentication details.
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
