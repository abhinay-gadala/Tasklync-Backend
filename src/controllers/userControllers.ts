import userData from "../models/userModel.js";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from 'bcrypt'

// controllers/authController.js

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
};

export const signup = async (req:Request, res:Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await userData.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
  
    const hashPassword = await bcrypt.hash(password, 10)

    const user = await userData.create({ name, email, password:hashPassword });

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(user._id.toString()),
      user,
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req:Request, res:Response) => {
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
    try{
      const users = await userData.find()
      res.status(200).json({
        message: "get Successful",
        users
      })

    }
    catch(e: any){
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


export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await userData.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: "User not found" });  
    res.json({ message: "User deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};