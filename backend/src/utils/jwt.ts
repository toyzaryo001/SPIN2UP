import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
// 7 days in seconds
const JWT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

export interface JwtPayload {
    userId: number;
    role: string;
    isAdmin?: boolean;
    prefix?: string;
}

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN_SECONDS });
}

export function verifyToken(token: string): JwtPayload {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
