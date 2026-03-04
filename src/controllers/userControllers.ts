import userData from "../models/userModel.js";
import projectData from "../models/projectModel.js";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../middlewares/authMiddleware.js";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

// controllers/authController.js

const generateToken = (id: string, role?: string) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await userData.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    const hashPassword = await bcrypt.hash(password, 10)

    const user = await userData.create({ name, email, password: hashPassword });

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(user._id.toString(), user.role || "pending"),
      user,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await userData.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.status(200).json({
      message: "Login successful",
      token: generateToken(user._id.toString()),
      user,
      needsPasswordReset: user.needsPasswordReset
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getDetails = async (req: Request, res: Response) => {
  try {
    const users = await userData.find()
    res.status(200).json({
      message: "get Successful",
      users
    })

  }
  catch (e: any) {
    res.status(500).json({
      message: e.message
    })
  }
}

export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const users = await userData.findById(userId).select('-password');
    if (!users) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "User retrieved successfully",
      users
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { name, email, password, needsPasswordReset } = req.body;

    const user = await userData.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
      user.needsPasswordReset = false;
    }
    if (needsPasswordReset !== undefined) user.needsPasswordReset = needsPasswordReset;

    await user.save();
    res.json({ message: "User updated", user });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const setPassword = async (req: Request, res: Response) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) return res.status(400).json({ message: "User ID and password are required" });

    const user = await userData.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(password, 10);
    user.needsPasswordReset = false;

    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};


export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const adminId = req.user?.id;
    const adminRole = req.user?.role;
    const targetUserId = req.params.id;

    if (!adminId || adminRole !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can delete employees." });
    }

    if (adminId === targetUserId) {
      return res.status(400).json({ message: "Action forbidden: You cannot delete your own admin account." });
    }

    // Verify target user is actually an employee/member belonging to one of this admin's projects
    const adminProjects = await projectData.find({ adminId });
    let isUserInAdminWorkspace = false;

    for (const project of adminProjects) {
      if (project.members.includes(targetUserId as any)) {
        isUserInAdminWorkspace = true;
        break;
      }
    }

    if (!isUserInAdminWorkspace) {
      return res.status(403).json({ message: "Action forbidden: User does not belong to your workspace or you lack permissions." });
    }

    // Secondary check: Protect against deleting other admins
    const targetUser = await userData.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (targetUser.role === "admin") {
      return res.status(403).json({ message: "Action forbidden: Cannot delete another admin account." });
    }

    // Proceed with deletion and cascade clean up
    await userData.findByIdAndDelete(targetUserId);

    // Remove user from the members array of all projects
    await projectData.updateMany(
      { members: targetUserId },
      { $pull: { members: targetUserId } }
    );

    res.json({ message: "Employee deleted successfully and removed from all projects" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};