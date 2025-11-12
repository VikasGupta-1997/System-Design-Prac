import * as argon2 from 'argon2';

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id, timeCost: 3, memoryCost: 19456, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}
