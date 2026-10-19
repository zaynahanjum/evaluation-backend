import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import 'dotenv/config';

const SALT_ROUNDS = 12;

// ─── Environment ────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const JWT_SECRET = (): string => requireEnv('JWT_SECRET');
export const JWT_REFRESH_SECRET = (): string => requireEnv('JWT_REFRESH_SECRET');
export const JWT_EXPIRES_IN = (): string => process.env['JWT_EXPIRES_IN'] ?? '15m';
export const JWT_REFRESH_EXPIRES_IN = (): string => process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';

// ─── Password ────────────────────────────────────────────────────────────────

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ─── JWT Payload Types ───────────────────────────────────────────────────────

export interface StaffTokenPayload {
  sub: string;        // userId
  role: 'ADMIN' | 'MENTOR' | 'JUDGE';
  type: 'staff';
}

export interface TeamTokenPayload {
  sub: string;        // teamId
  role: 'TEAM';
  type: 'team';
}

export type TokenPayload = StaffTokenPayload | TeamTokenPayload;

// ─── Token Generation ────────────────────────────────────────────────────────

export function generateAccessToken(payload: TokenPayload): string {
  const opts: jwt.SignOptions = { expiresIn: JWT_EXPIRES_IN() as NonNullable<jwt.SignOptions['expiresIn']> };
  return jwt.sign(payload as object, JWT_SECRET(), opts);
}

export function generateRefreshToken(payload: TokenPayload): string {
  const opts: jwt.SignOptions = { expiresIn: JWT_REFRESH_EXPIRES_IN() as NonNullable<jwt.SignOptions['expiresIn']> };
  return jwt.sign(payload as object, JWT_REFRESH_SECRET(), opts);
}

// ─── Token Verification ──────────────────────────────────────────────────────

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET()) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET()) as TokenPayload;
}

// ─── Expiry helper (for storing in DB) ──────────────────────────────────────

export function refreshTokenExpiryDate(): Date {
  const expires = JWT_REFRESH_EXPIRES_IN();
  const ms = parseExpiry(expires);
  return new Date(Date.now() + ms);
}

function parseExpiry(str: string): number {
  const match = /^(\d+)([smhd])$/.exec(str);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
  const num = parseInt(match[1] ?? '7', 10);
  const unit = match[2];
  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default:  return 7 * 24 * 60 * 60 * 1000;
  }
}
