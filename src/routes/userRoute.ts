import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { signupSchema, loginSchema } from "../validations/authValidation.js";
import { signup, login, getDetails } from "../controllers/userControllers.js";

const route = Router();

route.post("/signup", validate(signupSchema), signup)
route.post('/login', validate(loginSchema),  login)
route.get("/read", getDetails)



export default route