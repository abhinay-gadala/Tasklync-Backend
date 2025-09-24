import type { Request, Response } from "express";
import CommentData from "../models/commentModel.js";
import { Types } from "mongoose";


interface AuthRequest extends Request {
  user?: {
    id: string;
    role: "admin" | "employee";
  };
}

export const addReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, text } = req.body;
    const userId = req.user!.id;

    const comment = await CommentData.findById(commentId).populate({
      path: "task",
      populate: { path: "project" }
    });

    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const project = (comment.task as any).project;
    if (!project.members.includes(userId) && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to reply" });
    }

  comment.replies.push({ user: new Types.ObjectId(userId), text, createdAt: new Date() });
    await comment.save();

    res.status(201).json({ message: "Reply added", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ Edit a reply
export const editReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, replyId, text } = req.body;
    const userId = req.user!.id;

    const comment = await CommentData.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const reply = comment.replies.find((r: any) => r._id.toString() === replyId);
    if (!reply) return res.status(404).json({ message: "Reply not found" });

    if (reply.user.toString() !== userId && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to edit reply" });
    }

    reply.text = text;
    reply.updatedAt = new Date();
    await comment.save();

    res.status(200).json({ message: "Reply updated", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ➤ Delete a reply
export const deleteReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, replyId } = req.params;
    const userId = req.user!.id;

    const comment = await CommentData.findById(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    const replyIndex = comment.replies.findIndex((r: any) => r._id.toString() === replyId);
    if (replyIndex === -1) return res.status(404).json({ message: "Reply not found" });

    const reply = comment.replies[replyIndex];
    if (!reply) return res.status(404).json({ message: "Reply not found" });
    if (reply.user.toString() !== userId && req.user!.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to delete reply" });
    }

    comment.replies.splice(replyIndex, 1);
    await comment.save();

    res.status(200).json({ message: "Reply deleted", comment });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
