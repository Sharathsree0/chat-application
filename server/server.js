import express from "express";
import morgan from "morgan";
import "dotenv/config"
import http from "http"
import cors from "cors"
import cookieParser from "cookie-parser"
import { Server } from "socket.io";
import { connectDB } from "./src/lib/db.js";
import userRouter from "./src/routes/userRoutes.js";
import messageRouter from "./src/routes/messageRoutes.js";
import aiRouter from "./src/routes/aiRoutes.js";
import { protectedRoute } from "./src/middleWare/auth.js";
const app =express()
const PORT =process.env.PORT || 5000
const server = http.createServer(app)

//socket.io to server
export const io = new Server(server,{
  pingTimeout:60000,
  cors:{
    origin:process.env.CLIENT_URL,
    credentials:true
  }
})

//online by using socketId as userID
export const userSocketMap={}; 
//connecting socket handler
io.on("connection",(socket)=>{
  const userId= socket.handshake.query.userId;
  socket.userId = userId;
  console.log("user connected",userId);
  if(userId) userSocketMap[userId]=socket.id;
  //typing listener
  socket.on("typing",(receiverId)=>{
    const reciverSocketId= userSocketMap[receiverId];
    if(reciverSocketId){
      io.to(reciverSocketId).emit("typing")
    }
  });
  socket.on("stop typing",(receiverId)=>{
    const reciverSocketId= userSocketMap[receiverId]; 
   if(reciverSocketId){
      io.to(reciverSocketId).emit("stop typing")
    }
  })
  //message seen 
  socket.on("seenMessage", ({ senderId }) => {
  const senderSocketId = userSocketMap[senderId];
  if (senderSocketId) {
    io.to(senderSocketId).emit("messagesSeen",{receiverId:userId});
  }
});

  // showing online users
io.emit("getOnlineUsers",Object.keys(userSocketMap))
  socket.on("disconnect", () => {
  const userId = socket.userId;
  delete userSocketMap[userId];

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

});

  //audio call invocking
socket.on("callUser", ({ receiverId, offer, callType }) => {
   const reciverSocketId = userSocketMap[receiverId]

   if (reciverSocketId) {
      io.to(reciverSocketId).emit("incomingCall", {
        offer,
        callerId: socket.userId,
        callerName: socket.handshake.query.fullName,
        profilePic: socket.handshake.query.profilePic, 
        callType
      })
   }
})

socket.on("answerCall", ({ callerId, answer }) => {
   const callerSocketId = userSocketMap[callerId]
if (callerSocketId) {
   io.to(callerSocketId).emit("callAnswered", { answer })
}})
socket.on("iceCandidate", ({ receiverId, candidate }) => {
   const receiverSocketId = userSocketMap[receiverId]
   if (receiverSocketId) {
      io.to(receiverSocketId).emit("iceCandidate", { candidate })
   }
})
socket.on("endCall", ({ receiverId }) => {
   const receiverSocketId = userSocketMap[receiverId]

   if (receiverSocketId) {
      io.to(receiverSocketId).emit("callEnded")
   }
})
})

app.use(express.json({limit:"4mb"}));
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(morgan("dev"))
app.use(cookieParser())
await connectDB()

app.use("/api/auth",userRouter)
app.use("/api/ai",aiRouter)
app.use("/api/messages",messageRouter)
app.get("/api/status",(req,res)=>{
  res.send("its working")
})

server.listen(PORT,()=> console.log(`Running in http://localhost:${PORT}/`))
