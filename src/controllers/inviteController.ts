import crypto from "crypto";
import projectData from "../models/projectModel.js";
import userData from "../models/userModel.js";
import taskData from "../models/taskModel.js";
import ProjectInvite from "../models/inviteModel.js";
import { sendInviteMail } from "../utils/mailer.js";
import type { Response } from "express";
import bcrypt from "bcrypt";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware.js";

// --- Send invite (admin)
export const sendProjectInvite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, email, taskId } = req.body;
    const invitedBy = req.user?.id;
    const project = await projectData.findById(projectId);
    if (!project) return res.status(404).json({ message: "Project not found" });

    const token = crypto.randomBytes(32).toString("hex");
    const tempPassword = crypto.randomBytes(4).toString("hex");

    await ProjectInvite.create({
      project: projectId,
      email,
      invitedBy,
      token,
      tempPassword,
      pendingTaskIds: taskId ? [taskId] : [],
    });

    await sendInviteMail(email, project.name, token, tempPassword);

    return res.status(201).json({ message: "Invitation created", token });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};


// --- Verify invite (frontend calls this to show info)
export const verifyInvite = async (req: any, res: Response) => {
  try {
    const { token } = req.params;
    const invite = await ProjectInvite.findOne({ token });

    if (!invite) return res.status(404).json({ message: "Invalid or expired invite token" });
    if (invite.status !== "pending") return res.status(400).json({ message: "Invite already accepted or expired" });

    // return minimal info (do not include tempPassword)
    return res.status(200).json({
      email: invite.email,
      projectId: invite.project,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// --- Accept invite (user clicks Accept)
export const acceptInvite = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { token } = req.params;
    const invite = await ProjectInvite.findOne({ token });
    if (!invite) return res.status(404).json({ message: "Invite not found" });
    if (invite.status !== "pending") return res.status(400).json({ message: "Invite not available" });

    // find or create user using invite.email
    let user = await userData.findOne({ email: invite.email });
    if (!user) {
      const hashed = await bcrypt.hash(invite.tempPassword || crypto.randomBytes(8).toString("hex"), 10);
      user = await userData.create({
        name: invite.email.split("@")[0],
        email: invite.email,
        password: hashed,
        role: "employee",
        needsPasswordReset: true,
      });
    }

    // atomically add user to project members and user's projects
    await projectData.findByIdAndUpdate(invite.project, { $addToSet: { members: user._id } });
    await userData.findByIdAndUpdate(user._id, { $addToSet: { projects: invite.project } });

    // assign pending tasks (single update)
    if (Array.isArray(invite.pendingTaskIds) && invite.pendingTaskIds.length > 0) {
      await taskData.updateMany(
        { _id: { $in: invite.pendingTaskIds } },
        { $set: { assignedTo: user._id }, $unset: { assignedEmail: "" } }
      );
    }

    invite.status = "accepted";
    await invite.save();

    return res.status(200).json({ message: "Invite accepted", userId: user._id, email: user.email });
  } catch (err: any) {
    console.error("acceptInvite:", err);
    return res.status(500).json({ message: err.message });
  }
};