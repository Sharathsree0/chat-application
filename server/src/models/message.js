import mongoose from "mongoose";
import User from "./user.js";
import { text } from "express";

const messageSchema= new mongoose.Schema({
    senderId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    receiverId:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    text:{type:String},
    audio: { type: String },
    image:{type:String},
    seen:{type:Boolean,default:false},
    status:{
        type:String,
        enum:["sent","delivered","seen"],
        default:"sent"
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    editedAt:{
        type:Date,
        default:null
    },
    editHistory:[
    {
        text:String,
        editedAt:Date
    }
],
    reactions:[
       { 
        userId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User",
            required:true
        },
        emoji:{
            type:String,
            required:true
        }
    }
    ]
},{
    timestamps:true
});

const Message = mongoose.model("Message",messageSchema);
export default Message; 