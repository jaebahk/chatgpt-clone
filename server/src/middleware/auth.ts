import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Allow mock token for development/testing
  if (token === 'mock-token') {
    (req as any).user = {
      id: 'mock-user-id',
      email: 'test@example.com',
      name: 'Test User'
    };
    return next();
  }

  try {
    const user = verifyToken(token);
    (req as any).user = user;
    next();
  } catch (error) {
    console.log('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};