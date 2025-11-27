import jwt from 'jsonwebtoken';
import { config } from '../config/index';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: JwtPayload): string => {
  // @ts-expect-error - expiresIn accepts string like '1h'
  return jwt.sign(payload as object, config.jwt.secret, { expiresIn: config.jwt.expire });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  // @ts-expect-error - expiresIn accepts string like '7d'
  return jwt.sign(payload as object, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
  });
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
};
