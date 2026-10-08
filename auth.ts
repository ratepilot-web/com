import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db, User } from './db';

const JWT_SECRET = process.env.SECRET_KEY || 'terrkeet_jwt_production_secret_key_2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      sub: user.id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ detail: 'Authentication token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded: any) => {
    if (err || !decoded) {
      res.status(401).json({ detail: 'Invalid or expired token' });
      return;
    }

    const user = db.users.find((u) => u.id === parseInt(decoded.sub, 10));
    if (!user || !user.isActive) {
      res.status(401).json({ detail: 'User not found or deactivated' });
      return;
    }

    req.user = user;
    next();
  });
}

export function requireRole(allowedRole: 'WORKER' | 'FINANCIAL_DEPARTMENT') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ detail: 'Unauthorized' });
      return;
    }

    if (req.user.role !== allowedRole) {
      res.status(403).json({
        detail: `Access denied: requires ${allowedRole} role privileges`,
      });
      return;
    }

    next();
  };
}
