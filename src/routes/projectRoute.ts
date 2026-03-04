import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createProject, deleteProject, getAllProjects, getProjectDetails, joinProject, updateProject } from "../controllers/projectControllers.js";
import { validate } from "../middlewares/validate.js";
import { projectSchema, joinProjectSchema } from "../validations/appValidations.js";


const routes = express.Router();

routes.post("/create", authMiddleware, validate(projectSchema), createProject);
routes.post('/join', authMiddleware, validate(joinProjectSchema), joinProject);
routes.get("/details/:id", authMiddleware, getProjectDetails);
routes.get("/get", authMiddleware, getAllProjects); // Get all projects for admin/user
routes.put("/:id", authMiddleware, validate(projectSchema), updateProject); // Update project details
routes.delete("/:id", authMiddleware, deleteProject); // Delete project (admin only)


export default routes;
