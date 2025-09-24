import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  addComment,
} from "../controllers/taskControllers.js";

const router = express.Router();

// All routes protected by authMiddleware
router.use(authMiddleware);

router.post("/", createTask);                    // Admin creates task
router.get("/project/:projectId", getTasks);    // Get tasks (admin or employee)
router.put("/:id", updateTask);                 // Update task
router.delete("/:id", deleteTask);              // Admin only
router.post("/:id/comment", addComment);        // Add comment

export default router;
