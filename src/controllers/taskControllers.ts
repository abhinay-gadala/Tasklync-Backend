import { Types } from "mongoose";
import type { Request, Response } from "express";
import taskData from "../models/taskModel.js";
import userData from "../models/userModel.js";
import projectData from "../models/projectModel.js";
import ProjectInvite from "../models/inviteModel.js";
import { sendInviteMail } from "../utils/mailer.js";
import crypto from "crypto";

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

// CREATE TASK (Admin only)
// CREATE TASK (Admin only)
export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // include dueDate & priority in destructuring
    const { title, description, project, assignedTo, assignedEmail, dueDate, priority } = req.body;

    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin can create tasks" });
    }

    // validate project exists
    const proj = await projectData.findById(project);
    if (!proj) return res.status(404).json({ message: "Project not found" });

    // create task (use Types.ObjectId where appropriate)
    const task = await taskData.create({
      title,
      description,
      status: "todo",
      priority: priority || "medium",
      dueDate: dueDate ? new Date(dueDate) : undefined,
      project: proj._id,
      assignedTo: assignedTo ? assignedTo : undefined,
      assignedEmail: assignedEmail ? String(assignedEmail).toLowerCase().trim() : undefined,
      createdBy: req.user.id,
    });

    // add task to project.tasks using $addToSet
    await projectData.findByIdAndUpdate(proj._id, { $addToSet: { tasks: task._id } });

    // if assignedTo (existing user) -> ensure membership & user's projects
    if (assignedTo) {
      await projectData.findByIdAndUpdate(proj._id, { $addToSet: { members: assignedTo } });
      await userData.findByIdAndUpdate(assignedTo, { $addToSet: { projects: proj._id } });
    }

    // if assigned by email: upsert an invite and attach pending task
    if (assignedEmail && !assignedTo) {
      const token = crypto.randomBytes(32).toString("hex");
      const tempPassword = crypto.randomBytes(6).toString("hex");
      const normalizedEmail = String(assignedEmail).toLowerCase().trim();

      let invite = await ProjectInvite.findOne({ project: proj._id, email: normalizedEmail });
      if (!invite) {
        invite = await ProjectInvite.create({
          project: proj._id,
          email: normalizedEmail,
          invitedBy: req.user.id,
          token,
          tempPassword,
          pendingTaskIds: [task._id],
          status: "pending",
        });
      } else {
        if (!Array.isArray(invite.pendingTaskIds)) invite.pendingTaskIds = [];
        if (!invite.pendingTaskIds.map(String).includes(String(task._id))) {
          invite.pendingTaskIds.push(task._id);
        }
        invite.token = token;
        invite.tempPassword = tempPassword;
        invite.status = "pending";
        await invite.save();
      }

      // send invite email
      await sendInviteMail(invite.email, proj.name, invite.token, invite.tempPassword);
    }

    return res.status(201).json({ message: "Task created", task });
  } catch (err: any) {
    console.error("createTask error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};





// GET TASKS
export const getTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;

    let tasks;
    if (req.user?.role === "admin") {
      tasks = await taskData.find({ project: projectId })
    } else {
      tasks = await taskData.find({ project: projectId, assignedTo: req.user?.id })
    }

    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE TASK
const ALLOWED_STATUSES = ["todo", "in-progress", "done"] as const;
type StatusKey = typeof ALLOWED_STATUSES[number];

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    if (!taskId) return res.status(400).json({ message: "Task id required" });

    const task = await taskData.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const role = req.user?.role;
    const userId = req.user?.id;

    // === Employee permission: only allow status update on tasks assigned to them ===
    if (role === "employee") {
      // Must be assigned to the employee
      if (!task.assignedTo || String(task.assignedTo) !== String(userId)) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Allow only a status change
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: "No status provided" });
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` });
      }

      task.status = status as StatusKey;
      await task.save();

      const populated = await taskData.findById(taskId).populate("project", "name").populate("assignedTo", "name email");
      return res.status(200).json({ message: "Task status updated", task: populated });
    }

    // === Admin permission: allow specific fields only (prevent accidental full overwrite) ===
    if (role === "admin") {
      const {
        title,
        description,
        status,
        priority,
        dueDate,
        assignedTo,
        assignedEmail
      } = req.body;

      // Validate status if provided
      if (status && !ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` });
      }

      // Apply safe updates
      if (typeof title === "string") task.title = title;
      if (typeof description === "string") task.description = description;
      if (typeof priority === "string") task.priority = priority;
      if (dueDate) task.dueDate = new Date(dueDate);
      if (status) task.status = status as StatusKey;

      // If admin sets assignedTo (user id), update and ensure membership
      let assignedToChanged = false;
      let newAssignedToId: string | undefined;
      if (assignedTo) {
        // normalize id
        newAssignedToId = String(assignedTo);
        if (!task.assignedTo || String(task.assignedTo) !== newAssignedToId) {
          task.assignedTo = newAssignedToId as any;
          // clear assignedEmail when admin assigns a real user
          task.assignedEmail = undefined;
          assignedToChanged = true;
        }
      } else if (assignedEmail) {
        // If admin assigned by email (no user id), set assignedEmail (no membership changes here)
        task.assignedEmail = String(assignedEmail).toLowerCase().trim();
      }

      await task.save();

      // If assignedTo changed, ensure project membership and user's projects array
      if (assignedToChanged && newAssignedToId) {
        const projId = task.project;
        if (projId) {
          // add to project members
          await projectData.findByIdAndUpdate(projId, { $addToSet: { members: newAssignedToId } });

          // add project to user's projects
          await userData.findByIdAndUpdate(newAssignedToId, { $addToSet: { projects: projId } });
        }
      }

      const populated = await taskData.findById(taskId).populate("project", "name").populate("assignedTo", "name email");
      return res.status(200).json({ message: "Task updated", task: populated });
    }

    // others (pending role, guest) -> not allowed
    return res.status(403).json({ message: "Not authorized" });
  } catch (err: any) {
    console.error("updateTask error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// DELETE TASK (Admin only)
export const deleteTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only admin can delete tasks" });
    }

    const taskId = req.params.id;
    const deleted = await taskData.findByIdAndDelete(taskId);
    if (deleted) {
      // remove task from project's tasks array
      await projectData.findByIdAndUpdate(deleted.project, { $pull: { tasks: deleted._id } });
    }
    res.json({ message: "Task deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};



export const getAllTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Find project ids where user is admin or a member
    const projDocs = await projectData.find({
      $or: [
        { adminId: userId },
        { members: userId }
      ]
    }, { _id: 1 });

    const projectIds = projDocs.map(p => p._id);

    // Return tasks assigned to user OR tasks in those projects
    const tasks = await taskData.find({
      $or: [
        { assignedTo: userId },       // tasks directly assigned to them
        { project: { $in: projectIds } }              // tasks inside user's projects
      ]
    })
      .populate("project", "name")
      .populate("assignedTo", "name email");

    return res.status(200).json({ tasks });
  } catch (err: any) {
    console.error("getAllTasks error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};


