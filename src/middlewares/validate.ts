import type { Request, Response, NextFunction } from "express";
import { z } from "zod"; // just import z from zod

export const validate = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body); // validate request body
      next();
    } catch (error: any) {
      // check if error has 'errors' property (from zod)
      if (error.errors) {
        return res.status(400).json({
          errors: error.errors.map((e: any) => e.message),
        });
      }
      return res.status(500).json({ error: "Internal Server Error" });
    }
  };
};
