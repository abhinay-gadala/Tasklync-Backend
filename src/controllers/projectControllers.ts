import type { Response } from "express";
import projectData from "../models/projectModel.js";
import userData from "../models/userModel.js";
import taskData from "../models/taskModel.js";
import ProjectInvite from "../models/inviteModel.js";
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { Types } from "mongoose";

// Generate a unique project code
const generateUniqueProjectCode = async (): Promise<string> => {
  let projectCode: string;
  let isUnique = false;
  
  while (!isUnique) {
    projectCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingProject = await projectData.findOne({ code: projectCode });
    if (!existingProject) {
      isUnique = true;
      return projectCode;
    }
  }
  throw new Error("Could not generate unique project code");
};

// CREATE PROJECT
export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, companyName, companyEmail, companyAddress } = req.body;
    const adminId = req.user?.id;

    if (!name || !companyName || !companyAddress || !companyEmail) {
      return res.status(400).json({ 
        status: "error",
        message: "Project name, company name, company address, and company email are required" 
      });
    }

    // Check if project name already exists for this admin
    const existingProject = await projectData.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      adminId 
    });
    
    if (existingProject) {
      return res.status(400).json({ 
        status: "error",
        message: "A project with this name already exists" 
      });
    }

    // Generate unique project code
    const projectCode = await generateUniqueProjectCode();

    const project = await projectData.create({
      name,
      code: projectCode,
      adminId,
      members: [adminId],
      companyName,
      companyEmail,
      companyAddress,
      tasks: []
    });

    // Update user role and add project reference
    await userData.findByIdAndUpdate(adminId, {
      role: "admin",
      $addToSet: { projects: project._id }, // Use addToSet to prevent duplicates
    });

    res.status(201).json({
      status: "success",
      message: "Project created successfully",
      project: {
        _id: project._id,
        name: project.name,
        code: project.code
      }
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// JOIN PROJECT
export const joinProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!code) return res.status(400).json({ message: "Project code required" });

    const project = await projectData.findOne({ code });
    if (!project) return res.status(404).json({ message: "Invalid project code" });

    // add member using $addToSet
    await projectData.findByIdAndUpdate(project._id, { $addToSet: { members: userId } });

    // add project to user's projects array using $addToSet
    await userData.findByIdAndUpdate(userId, { $addToSet: { projects: project._id }, $set: { role: "employee" } });

    return res.status(200).json({ message: "Joined project successfully", projectId: project._id });
  } catch (err: any) {
    console.error("joinProject:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const getProjectDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    let project;

    if (role === "admin") {
      // Admin can access project they created
      project = await projectData.findOne({
        _id: projectId,
        adminId: userId,
      });
    } else {
      // Employee must be a member
      project = await projectData.findOne({
        _id: projectId,
        members: userId,
      });
    }

    if (!project) {
      return res
        .status(404)
        .json({ message: "Project not found or access denied" });
    }

    await project.populate("members", "name email role");
    await project.populate({
      path: "tasks",
      select: "title status priority assignedTo createdBy dueDate description",
      populate: [
        { path: "assignedTo", select: "name email" },
        { path: "createdBy", select: "name email" },
      ],
    });

    res.status(200).json({ project });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};


export const getAllProjects = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Query: projects where user is admin OR member
    // For employees this still works (they won't be adminId of others)
    const projects = await projectData.find({
      $or: [
        { adminId: userId },      // projects created by this user
        { members: userId }       // projects where they are a member
      ]
    })
      .populate("members", "name email role")
      .populate({
        path: "tasks",
        select: "title status priority assignedTo dueDate"
      });

    return res.status(200).json({
      message: "Projects fetched successfully",
      count: projects.length,
      projects,
    });
  } catch (err: any) {
    console.error("getAllProjects error:", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

export const updateProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.params.id;

    if (req.user?.role !== "admin") {
      return res.status(403).json({ message: "Only admin can update project details" });
    }

    // ✅ Only allow specific fields
    const { name, companyName, companyEmail, companyAddress } = req.body;

    const updatedProject = await projectData.findByIdAndUpdate(
      projectId,
      { name, companyName, companyEmail, companyAddress },
      { new: true }
    );

    if (!updatedProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.status(200).json({
      message: "Project updated successfully",
      project: updatedProject,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};


export const deleteProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const userId = req.user?.id;

    if (!projectId) {
      return res.status(400).json({
        status: "error",
        message: "Project ID is required",
      });
    }

    // 1️⃣ Find project
    const project = await projectData.findById(projectId);
    if (!project) {
      return res.status(404).json({
        status: "error",
        message: "Project not found",
      });
    }

    // 2️⃣ Only project admin or user with role 'admin' can delete
    if (String(project.adminId) !== String(userId) && req.user?.role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "You are not allowed to delete this project",
      });
    }

    const session = await projectData.startSession();
    try {
      await session.withTransaction(async () => {
        const projectObjectId = new Types.ObjectId(projectId);

        // 3️⃣ Find all users who have this project in their `projects` array
        const users = await userData
          .find({ projects: projectObjectId })
          .session(session);

        for (const user of users) {
          // projects of this user
          const userProjects: Types.ObjectId[] = (user.projects || []) as any;

          // other projects (not this one)
          const otherProjects = userProjects.filter(
            (p) => p.toString() !== projectObjectId.toString()
          );

          const isProjectAdmin = project.adminId && project.adminId.toString() === user._id.toString();

          // ❗ Rule:
          // - If user is employee AND only in this project AND not the project admin => delete user
          // - Else: just pull this project from their projects array
          if (
            user.role === "employee" &&
            otherProjects.length === 0 &&
            !isProjectAdmin
          ) {
            // Delete this user completely
            await userData.deleteOne({ _id: user._id }).session(session);
          } else {
            // Just remove this project from their projects list
            await userData
              .updateOne(
                { _id: user._id },
                { $pull: { projects: projectObjectId } }
              )
              .session(session);
          }
        }

        // 4️⃣ Delete all tasks belonging ONLY to this project
        await taskData
          .deleteMany({ project: projectObjectId })
          .session(session);

        // 5️⃣ Delete all invites for this project (clean up)
        await ProjectInvite.deleteMany({ project: projectObjectId }).session(
          session
        );

        // 6️⃣ Finally delete the project itself
        await projectData.findByIdAndDelete(projectObjectId).session(session);
      });
    } finally {
      await session.endSession();
    }

    return res.status(200).json({
      status: "success",
      message:
        "Project, its tasks, and related member links were deleted successfully",
    });
  } catch (err: any) {
    console.error("deleteProject error:", err);
    return res.status(500).json({
      status: "error",
      message: err.message || "Server error",
    });
  }
};