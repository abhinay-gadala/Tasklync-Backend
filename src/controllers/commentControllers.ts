import type { Request, Response } from "express";
import CommentData from "../models/commentModel.js";
import projectData from "../models/projectModel.js";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: "admin" | "employee";
  };
}

/* ============================================================
   ➤ ADD COMMENT (Workspace-level)
============================================================ */
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, text } = req.body;
    const userId = req.user!.id;

    if (!workspaceId || !text) {
      return res.status(400).json({ message: "workspaceId and text are required" });
    }

    // ✅ Authorization check
    const project = await projectData.findById(workspaceId);
    if (!project) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (
      req.user!.role !== "admin" &&
      !project.members.map(String).includes(userId)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const comment = await CommentData.create({
      workspace: workspaceId,
      user: userId,
      text,
    });

    const populated = await comment.populate("user", "name role");

    res.status(201).json({
      message: "Message sent",
      comment: populated,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   ➤ GET COMMENTS (Workspace-level)
============================================================ */
export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user!.id;

    if (!workspaceId) {
      return res.status(400).json({ message: "workspaceId is required" });
    }

    const project = await projectData.findById(workspaceId);
    if (!project) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (
      req.user!.role !== "admin" &&
      !project.members.map(String).includes(userId)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const comments = await CommentData.find({ workspace: workspaceId })
      .populate("user", "name role")
      .populate("replies.user", "name role")
      .sort({ createdAt: 1 });

    res.status(200).json({
      count: comments.length,
      comments,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   ➤ EDIT COMMENT
============================================================ */
export const editComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // ✅ FIXED
    const { text } = req.body;
    const userId = req.user!.id;

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    const comment = await CommentData.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (
      comment.user.toString() !== userId &&
      req.user!.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    comment.text = text;
    comment.updatedAt = new Date();
    await comment.save();

    res.status(200).json({
      message: "Message updated",
      comment,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   ➤ DELETE COMMENT
============================================================ */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // ✅ FIXED
    const userId = req.user!.id;

    const comment = await CommentData.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (
      comment.user.toString() !== userId &&
      req.user!.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await comment.deleteOne();

    res.status(200).json({ message: "Message deleted" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
