import express from "express";
import { protectedRoute } from "../middleWare/auth.js";
import { deleteMessage, editMessage, getAllUsers, getMessage, markMessageSeen, reactToMessage, sendMessage } from "../controller/messageController.js";

const messageRouter = express.Router()

messageRouter.get("/users",protectedRoute,getAllUsers)
messageRouter.put("/mark/:id",protectedRoute,markMessageSeen)
messageRouter.get("/:id",protectedRoute,getMessage)
messageRouter.post("/send/:id",protectedRoute,sendMessage)
messageRouter.post("/react/:messageId",protectedRoute,reactToMessage)
messageRouter.put ("/edit/:messageId",protectedRoute,editMessage)
messageRouter.delete("/delete/:messageId", protectedRoute, deleteMessage);
export default messageRouter

