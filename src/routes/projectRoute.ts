import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { createProject, joinProject, getProjectDetails } from "../controllers/projectControllers.js";


const routes = express.Router();

routes.post("/create", authMiddleware, createProject);
routes.post("/join", authMiddleware, joinProject);
routes.get("/details/:id", authMiddleware, getProjectDetails);

export default routes;
