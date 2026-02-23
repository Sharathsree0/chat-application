import express from "express";
import { checkingAuth, login, logout, signup, updateProfile } from "../controller/userController.js";
import { protectedRoute } from "../middleWare/auth.js";

const userRouter=express.Router();

userRouter.post("/signup",signup);
userRouter.post("/login",login);
userRouter.post("/logout", logout);
userRouter.put("/update-profile",protectedRoute,updateProfile);
userRouter.get("/check",protectedRoute,checkingAuth);

export default userRouter;

