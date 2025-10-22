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
      userId: user._id,
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
      userId: user._id
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getDetails = async (req: Request, res: Response) => {
    try{
      const user = await userData.find()
      res.status(200).json({
        message: "get Successful",
        user
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
    const user = await userData.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "User retrieved successfully",
      user
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
