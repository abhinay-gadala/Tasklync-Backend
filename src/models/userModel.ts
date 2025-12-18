import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
     name: { type: String, required: true},
     email: {type: String, required: true},
     password: {type: String, required: true},
     role: {
        type: String,
        enum: ["pending", "admin", "employee"],
        default: "pending"
     },
     needsPasswordReset: { type: Boolean, default: false },
     projects: [{type: mongoose.Schema.Types.ObjectId, ref: "Project"}]
}, {timestamps: true})

const userData = mongoose.model("User", userSchema)

export default userData;