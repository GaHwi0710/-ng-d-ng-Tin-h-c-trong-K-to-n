import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "baby-shop-development-secret";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing access token" });
  }

  try {
    req.user = jwt.verify(header.slice(7), secret);
  } catch {
    return res.status(401).json({ message: "Invalid access token" });
  }

  next();
}
