import { Types } from "mongoose";
import type { Request, Response } from "express";
import taskData from "../models/taskModel.js";
import userData from "../models/userModel.js";
import projectData from "../models/projectModel.js";
import { ta } from "zod/locales";

interface AuthenticatedRequest extends Request {
  user?: { id: string; role: string };
}

// CREATE TASK (Admin only)
export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, priority, dueDate, project, assignedTo } = req.body;

    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only admin can create tasks" });
    }

    const newTask = await taskData.create({
      title,
      description,
      priority,
      dueDate,
      project,
      assignedTo,
      createdBy: req.user.id,
    });

    // add task id to project's tasks array
    try {
      await projectData.findByIdAndUpdate(project, { $push: { tasks: newTask._id } });
    } catch (e) {
      // If updating project fails, delete the created task to avoid orphan
      await taskData.findByIdAndDelete(newTask._id);
      return res.status(500).json({ message: "Failed to link task to project" });
    }

    res.status(201).json(newTask);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// GET TASKS
export const getTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.params.projectId;

    let tasks;
    if (req.user?.role === "admin") {
      tasks = await taskData.find({ project: projectId })
        .populate("assignedTo createdBy comments.user");
    } else {
      tasks = await taskData.find({ project: projectId, assignedTo: req.user?.id })
        .populate("assignedTo createdBy comments.user");
    }

    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE TASK
export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const task = await taskData.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (req.user?.role === "admin") {
      Object.assign(task, req.body); // Admin can update everything
    } else if (req.user?.role === "employee") {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      // Employee can only update status
      if (req.body.status) task.status = req.body.status;
    } else {
      return res.status(403).json({ message: "Not authorized" });
    }

    await task.save();
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
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

// ADD COMMENT TO TASK
export const addComment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const taskId = req.params.id;
    const { text } = req.body;

    const task = await taskData.findById(taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    // Employee can comment only on their own tasks
    if (req.user?.role === "employee" && task.assignedTo?.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to comment" });
    }

  task.comments.push({ user: new Types.ObjectId(req.user!.id), text, createdAt: new Date() });
    await task.save();

    res.json(task);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
