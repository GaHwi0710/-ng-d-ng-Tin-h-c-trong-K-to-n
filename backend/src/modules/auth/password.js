import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function passwordMatches(password, stored) {
  if (!stored?.includes(":")) return password === stored;
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  return expected.length === 64 && timingSafeEqual(expected, scryptSync(password, salt, 64));
}
