import type { Request, Response } from "express";
import projectData from "../models/projectModel.js";
import userData from "../models/userModel.js";
import type { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { Types } from "mongoose";

// CREATE PROJECT
export const createProject = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, companyName, companyAddress, companyEmail } = req.body;
    const adminId = req.user?.id;

    if (!name || !companyName || !companyAddress || !companyEmail) {
      return res.status(400).json({ message: "Project name, company name, company address, and company email are required" });
    }

    // Generate unique 6-char project code
    const projectCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const project = await projectData.create({
      name,
      code: projectCode,
      adminId,
      members: [adminId],
      companyName,
      companyAddress,
      companyEmail
    });

    await userData.findByIdAndUpdate(adminId, {
      role: "admin",
      $push: { projects: project._id },
    });

    res.status(201).json({
      message: "Project created successfully",
      projectCode,
      projectId: project._id,
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
  const userObjectId = userId ? new Types.ObjectId(userId) : undefined;

    if (!code) {
      return res.status(400).json({ message: "Project code is required" });
    }

    const project = await projectData.findOne({ code });
    if (!project) return res.status(404).json({ message: "Invalid project code" });

    if (userObjectId && !project.members.includes(userObjectId)) {
      project.members.push(userObjectId);
      await project.save();
    }

    await userData.findByIdAndUpdate(userId, {
      role: "employee",
      $push: { projects: project._id },
    });

    res.status(200).json({
      message: "Joined project successfully",
      projectId: project._id,
      projectName: project.name,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
