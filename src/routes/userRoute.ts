import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { signupSchema, loginSchema } from "../validations/authValidation.js";
import { signup, login, getDetails, getUserById, updateUser, deleteUser, setPassword } from "../controllers/userControllers.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";


const route = Router();

route.post("/signup", validate(signupSchema), signup)
route.post('/login', validate(loginSchema), login)
route.put('/set-password', setPassword)
route.get("/read", authMiddleware, getDetails)
route.get("/details/:id", authMiddleware, getUserById)
route.put("/:id", authMiddleware, updateUser);
route.delete("/:id", authMiddleware, deleteUser);



export default route