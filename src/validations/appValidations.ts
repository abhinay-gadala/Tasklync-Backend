import { z } from "zod";

export const projectSchema = z.object({
    name: z.string().min(1, "Project name is required").max(100),
    companyName: z.string().min(1, "Company Name is required"),
    companyEmail: z.string().email("Invalid email for Company Email"),
    companyAddress: z.string().min(1, "Company Address is required"),
});

export const joinProjectSchema = z.object({
    code: z.string().min(6, "Project Code should be exactly 6 characters").max(6, "Project Code should be exactly 6 characters"),
});

export const taskSchema = z.object({
    title: z.string().min(1, "Task title is required").max(100),
    description: z.string().optional(),
    status: z.enum(["todo", "in-progress", "done"]).optional(),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
    assignedTo: z.string().optional(),
    project: z.string().min(1, "A project ID is required"),
    dueDate: z.string().optional()
});
