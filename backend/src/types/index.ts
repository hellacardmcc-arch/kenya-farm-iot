import { Request } from 'express';

export interface JwtPayload {
  userId: string;
  phone: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
