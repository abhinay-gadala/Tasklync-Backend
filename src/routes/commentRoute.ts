import { Router } from "express";
import { addComment, getComments, editComment, deleteComment } from '../controllers/commentControllers.js'
import { addReply, editReply, deleteReply } from '../controllers/replyControllers.js'
import { authMiddleware } from "../middlewares/authMiddleware.js";

const routers = Router();

// 🔹 Comments
routers.post("/comment", authMiddleware, addComment);
routers.get("/comment/:taskId", authMiddleware, getComments);
routers.put("/comment", authMiddleware, editComment);
routers.delete("/comment/:commentId", authMiddleware, deleteComment);

// 🔹 Replies
routers.post("/reply", authMiddleware, addReply);
routers.put("/reply", authMiddleware, editReply);
routers.delete("/reply/:commentId/:replyId", authMiddleware, deleteReply);

export default routers;
