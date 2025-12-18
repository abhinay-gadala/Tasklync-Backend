import mongoose from "mongoose";

const inviteSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  token:   { type: String, required: true, unique: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tempPassword: { type: String },   
  status:  { type: String, enum: ["pending", "accepted", "expired"], default: "pending" },
  pendingTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
  // auto-expire in 7 days (optional TTL)
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7*24*60*60*1000) },
}, { timestamps: true });

inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ProjectInvite = mongoose.model("ProjectInvite", inviteSchema);
export default ProjectInvite;