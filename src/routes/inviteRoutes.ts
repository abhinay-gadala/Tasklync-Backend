import express from "express";
import { sendProjectInvite, verifyInvite, acceptInvite } from "../controllers/inviteController.js";
import { authMiddleware} from "../middlewares/authMiddleware.js";

const routem = express.Router();

routem.post("/send", authMiddleware, sendProjectInvite);
routem.get("/verify/:token", verifyInvite);
routem.post("/accept/:token", acceptInvite);

export default routem;