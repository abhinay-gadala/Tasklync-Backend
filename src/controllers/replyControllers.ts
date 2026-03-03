import type { Request, Response } from "express";
import CommentData from "../models/commentModel.js";
import projectData from "../models/projectModel.js";
import { Types } from "mongoose";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: "admin" | "employee";
  };
}

/* ============================================================
   ➤ ADD REPLY
============================================================ */
export const addReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, text } = req.body;
    const userId = req.user!.id;

    if (!commentId || !text) {
      return res.status(400).json({ message: "commentId and text are required" });
    }

    const comment = await CommentData.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // ✅ Workspace authorization
    const project = await projectData.findById(comment.workspace);
    if (
      project &&
      req.user!.role !== "admin" &&
      !project.members.map(String).includes(userId)
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    comment.replies.push({
      user: new Types.ObjectId(userId),
      text,
      createdAt: new Date(),
    });

    await comment.save();

    const populated = await CommentData.findById(comment._id)
      .populate("replies.user", "name role");

    res.status(201).json({
      message: "Reply sent",
      replies: populated?.replies,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   ➤ EDIT REPLY
============================================================ */
export const editReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, replyId, text } = req.body;
    const userId = req.user!.id;

    if (!commentId || !replyId || !text) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const comment = await CommentData.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const reply = comment.replies.find(
      (r) => r._id.toString() === replyId
    );
    if (!reply) {
      return res.status(404).json({ message: "Reply not found" });
    }

    if (
      reply.user.toString() !== userId &&
      req.user!.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    reply.text = text;
    reply.updatedAt = new Date();
    await comment.save();

    res.status(200).json({
      message: "Reply updated",
      replies: comment.replies,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   ➤ DELETE REPLY
============================================================ */
export const deleteReply = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId, replyId } = req.params;
    const userId = req.user!.id;

    if (!commentId || !replyId) {
      return res.status(400).json({ message: "Invalid request" });
    }

    const comment = await CommentData.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const replyIndex = comment.replies.findIndex(
      (r) => r._id.toString() === replyId
    );
    if (replyIndex === -1) {
      return res.status(404).json({ message: "Reply not found" });
    }

    const reply = comment.replies[replyIndex];
    if (
      reply.user.toString() !== userId &&
      req.user!.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    comment.replies.splice(replyIndex, 1);
    await comment.save();

    res.status(200).json({
      message: "Reply deleted",
      replies: comment.replies,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* ============================================================
   ➤ GET REPLIES (CORRECT WAY)
============================================================ */
// export const getReplies = async (req: AuthRequest, res: Response) => {
//   try {
//     const { commentId } = req.params;

//     const comment = await CommentData.findById(commentId)
//       .populate("replies.user", "name role");

//     if (!comment) {
//       return res.status(404).json({ message: "Comment not found" });
//     }

//     res.status(200).json({
//       count: comment.replies.length,
//       replies: comment.replies,
//     });
//   } catch (err: any) {
//     res.status(500).json({ message: err.message });
//   }
// };
