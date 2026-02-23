import cloudinary from "../lib/cloudinary.js";
import { generateToken } from "../lib/utils.js";
import User from "../models/user.js";
import bcrypt from "bcryptjs"

//sign up 
export const signup=async(req,res)=>{
    const {fullName,email,password,bio}=req.body;
try{

    if(!fullName || !email || !password || !bio){
        return res.json({success:false,message:"Details missing"})
    }
    const existingUser= await User.findOne({email})
    if(existingUser){
return res.status(400).json({success:false,message:"User already exists"})
    }
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password,salt)
    const newUser= await User.create({
        fullName,email,password:hashedPassword, bio
    })
    const token= generateToken(newUser._id)
        res.cookie("token",token,{httpOnly:true,secure:true,sameSite: "none", maxAge: 7 * 24 * 60 * 60 * 1000})
        res.json({success:true,userData:newUser,message:"Login successfully"})
}catch(error){
    console.log(error.message)
    res.json({success:false,message:error.message})

}};
//logout
export const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
        sameSite: "none"
    });

    res.json({ success: true, message: "Logged out successfully" });
};
//login

export const login =async(req,res)=>{
    try{
        const {email,password}=req.body;
        const userData = await User.findOne({ email });
        if (!userData) {
            return res.json({ success: false, message: "Invalid credentials" });}
        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect) {
            return res.json({ success: false, message: "Invalid credentials" });
}
        const token= generateToken(userData._id)
res.cookie("token", token, {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/"
});

            res.json({success:true,userData:userData,message:"Login successfully"})
    }catch(error){
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}

//checking user auth

export const checkingAuth= (req,res)=>{
    res.json({success:true,user:req.user});    
}
//profile update 

export const updateProfile=async(req,res)=>{
    try{
          console.log("PROFILE CONTROLLER HIT");
        const {fullName,bio,profilePic}=req.body;
        const userId=req.user._id;
        let updatedUser;

        if (!profilePic){
            updatedUser= await User.findByIdAndUpdate(userId,{bio,fullName},{new:true})
        }else{
            const upload= await cloudinary.uploader.upload(profilePic);
            updatedUser = await User.findByIdAndUpdate(userId,{profilePic:upload.secure_url,bio,fullName},{new:true})
        }
        res.json({success:true,user:updatedUser})

    }catch(error){
        console.log(error.message)
        res.json({success:false,message:error.message})

    }
}


