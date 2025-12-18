import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createProject, joinProject, getProjectDetails, getAllProjects, updateProject, deleteProject } from "../controllers/projectControllers.js";


const routes = express.Router();

routes.post("/create", authMiddleware, createProject);
routes.post("/join", authMiddleware, joinProject);
routes.get("/details/:id", authMiddleware, getProjectDetails);
routes.get("/get", authMiddleware, getAllProjects); // Get all projects for admin/user
routes.put("/:id", authMiddleware, updateProject); // Update project details
routes.delete("/:id", authMiddleware, deleteProject); // Delete project (admin only)


export default routes;
