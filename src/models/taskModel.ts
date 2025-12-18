import mongoose, { Document, Schema } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  dueDate?: Date;
  project: mongoose.Types.ObjectId;   // reference to Project
  assignedTo?: mongoose.Types.ObjectId; // reference to User
  createdBy: mongoose.Types.ObjectId;  // creator (User)
  comments: {
    user: mongoose.Types.ObjectId;
    text: string;
    createdAt: Date;
  }[];
}

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,

  // 🔥 IMPORTANT: status is required
  status: {
    type: String,
    enum: ["todo", "in-progress", "done"],
    default: "todo"
  },

  priority: { type: String, default: "Medium" },
  dueDate: Date,

  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },

  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assignedEmail: { type: String },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });


const taskData = mongoose.model<ITask>("Task", taskSchema);
export default taskData
