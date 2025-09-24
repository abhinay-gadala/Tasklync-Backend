import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

// Define our own payload interface
interface CustomJwtPayload extends JwtPayload {
  id: string;
}

// Ensure JWT_SECRET is always a non-empty string
const JWT_SECRET = ((process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0)
  ? process.env.JWT_SECRET
  : "a1b2h3i4n5a6y7") as string;

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];


  // jwt.verify can return string | JwtPayload
    if (!JWT_SECRET || JWT_SECRET.trim().length === 0) {
      throw new Error("JWT_SECRET environment variable is not set.");
    }
  const secret: string = JWT_SECRET;
  const decoded = jwt.verify(token as string, secret) as unknown;
    let payload: CustomJwtPayload | null = null;
    if (typeof decoded === "object" && decoded !== null && "id" in decoded) {
      payload = decoded as CustomJwtPayload;
    }
    if (!payload || typeof payload.id !== "string") {
      return res.status(401).json({ message: "Invalid token payload" });
    }
    req.user = { id: payload.id };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// {
//     "name": "content",
//     "companyName": "NIAT"
// }