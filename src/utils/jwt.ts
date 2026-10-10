import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  userId: string;
  role: string;
}

export const generateToken = (payload: JwtPayload, expiresIn: string | number = '24h'): string => {
  const secret = env.JWT_SECRET || 'omega-spa-dev-secret-change-in-production';
  const options: SignOptions = {
    expiresIn: expiresIn as any,
  };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = env.JWT_SECRET || 'omega-spa-dev-secret-change-in-production';
  return jwt.verify(token, secret) as JwtPayload;
};
