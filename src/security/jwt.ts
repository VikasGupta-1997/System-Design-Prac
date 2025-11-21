import jwt from "jsonwebtoken";
import crypto from "crypto";
import { redisClient } from "../db/redis";
import config from "../config";

export function signAccessToken(data: { userId: string }) {
  return jwt.sign(data, config.jwtSecret, { expiresIn: "15m" });
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, config.jwtSecret) as any;
  } catch {
    return null;
  }
}

export async function createMobileRefreshToken(userId: string) {
  const rid = crypto.randomBytes(32).toString("hex");

  await redisClient.set(
    `mobile_refresh:${rid}`,
    JSON.stringify({ userId }),
    "EX",
    60 * 60 * 24 * 30 // 30 days
  );

  return rid;
}

export async function consumeMobileRefreshToken(rid: string) {
  const raw = await redisClient.get(`mobile_refresh:${rid}`);
  if (!raw) return null;

  await redisClient.del(`mobile_refresh:${rid}`);
  return JSON.parse(raw);
}
