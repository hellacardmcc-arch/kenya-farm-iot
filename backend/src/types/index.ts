import { Request } from 'express';

export interface JwtPayload {
  farmerId: string;
  phone: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
