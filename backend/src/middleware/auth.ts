import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload | string;
    }
  }
}

// Middleware to verify JWT token
export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

// Middleware for farmer role (Kenya-specific)
export const isFarmer = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  if (typeof req.user === 'string') {
    res.status(403).json({
      success: false,
      message: 'Invalid user data.',
    });
    return;
  }

  if (req.user.role && req.user.role !== 'farmer') {
    res.status(403).json({
      success: false,
      message: 'Access denied. Farmer role required.',
    });
    return;
  }

  next();
};

// Optional: Generate token function for Kenyan farmers
export const generateToken = (farmerId: string, phone: string): string => {
  return jwt.sign(
    {
      id: farmerId,
      phone: phone,
      role: 'farmer',
      country: 'KE',
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
};
