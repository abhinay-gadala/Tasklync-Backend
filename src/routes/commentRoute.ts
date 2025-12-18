import { Router } from 'express';
import { addComment, getComments, editComment, deleteComment } from '../controllers/commentControllers.js'
import { addReply, editReply, deleteReply, getReplies } from '../controllers/replyControllers.js'
import { authMiddleware } from "../middlewares/authMiddleware.js";

const routers = Router();

// 🔹 Comments
routers.post("/comments", authMiddleware, addComment);
routers.get("/comments/:taskId", authMiddleware, getComments);
routers.put("/comments/:id", authMiddleware, editComment);
routers.delete("/comments/:id", authMiddleware, deleteComment);

// 🔹 Replies
routers.post("/replies", authMiddleware, addReply);
routers.get("/replies/:commentId", authMiddleware, getReplies);
routers.put("/replies/:id", authMiddleware, editReply);
routers.delete("/replies/:commentId/:replyId", authMiddleware, deleteReply);

export default routers;