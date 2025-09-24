import type { Request, Response } from "express";
import CommentData from "../models/commentModel.js";
import taskData from "../models/taskModel.js";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: "admin" | "employee";
  };
}

// ➤ Add a new comment
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId, text } = req.body;
    const userId = req.user!.id;

    const task = await taskData.findById(taskId).populate("project");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = task.project as any;
    if (!project.members.includes(userId) && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to comment" });
    }

    const comment = new CommentData({ task: taskId, user: userId, text });
    await comment.save();

    res.status(201).json({ message: "Comment added", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ Get all comments for a task
export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const userId = req.user!.id;

    const task = await taskData.findById(taskId).populate("project");
    if (!task) return res.status(404).json({ message: "Task not found" });

    const project = task.project as any;
    if (!project.members.includes(userId) && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to view comments" });
    }

    const comments = await CommentData.find({ task: taskId })
      .populate("user", "name role")
      .populate("replies.user", "name role");

    res.status(200).json(comments);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ Edit a comment
export const editComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, text } = req.body;
    const userId = req.user!.id;

    const comment = await CommentData.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== userId && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to edit comment" });
    }

    comment.text = text;
    comment.updatedAt = new Date();
    await comment.save();

    res.status(200).json({ message: "Comment updated", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ Delete a comment
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.id;

    const comment = await CommentData.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    if (comment.user.toString() !== userId && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete comment" });
    }

    await comment.deleteOne();
    res.status(200).json({ message: "Comment deleted" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
