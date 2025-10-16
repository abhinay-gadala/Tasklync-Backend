import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // for joining
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  companyName: { type: String, required: true },
  companyEmail: { type: String, required: true },
  companyAddress: { type: String , required: true },
}, { timestamps: true })

const projectData = mongoose.model('Project', projectSchema)

export default projectData