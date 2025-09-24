import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // for joining
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  companyName: { type: String, required: true },
  companyEmail: { type: String },
  companyAddress: { type: String },
  companyWebsite: { type: String }
}, { timestamps: true })

const projectData = mongoose.model('Project', projectSchema)

export default projectData