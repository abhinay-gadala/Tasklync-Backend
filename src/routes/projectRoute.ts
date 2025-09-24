import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createProject, joinProject } from "../controllers/projectControllers.js";

const routes = express.Router();

routes.post("/create", authMiddleware, createProject);
routes.post("/join", authMiddleware, joinProject);

export default routes;
