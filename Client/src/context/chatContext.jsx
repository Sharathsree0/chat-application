import { useContext } from "react";
import { useState } from "react";
import { createContext } from "react";
import { AuthContext } from "./authContext";
import toast from "react-hot-toast";
import { useEffect } from "react";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {

    const [messages, setMessages] = useState([])
    const [isTyping, setIsTyping] = useState(false);
    const [users, setUsers] = useState([])
    const [selectedUser, setSelectedUser] = useState(null)
    const [UnseenMessages, setUnSeenMessages] = useState({})
    const { socket, axios, authUser } = useContext(AuthContext)

    //get all user in sidebar
    const getUsers = async () => {
        try {
            const { data } = await axios.get("/api/messages/users")
            if (data.success) {
                setUsers(data.users);
                setUnSeenMessages(data.UnseenMessages || {});
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    //selected users fun
    const getMessages = async (userId) => {
        try {
            const { data } = await axios.get(`/api/messages/${userId}`)
            if (data.success) {
                setMessages(data.messages || []);

                // clear unseen when opening chat
                setUnSeenMessages(prev => ({
                    ...prev,
                    [userId]: 0
                }))
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // send mess to induvidual user
    const sendMessage = async (messageData) => {
        try {
            const { data } = await axios.post(`/api/messages/send/${selectedUser._id}`, messageData)
            if (data.success) {
                setMessages((preMessages) => [...preMessages, data.newMessage])
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }
    useEffect(() => {
   if (selectedUser) {
      getMessages(selectedUser._id)
   }
}, [selectedUser])

useEffect(() => {
   if (!authUser) {
      setSelectedUser(null)
      setMessages([])
   }
}, [authUser])

useEffect(() => {
   const savedId = localStorage.getItem("selectedUserId")

   if (savedId && users.length > 0) {
      const matchedUser = users.find(user => user._id === savedId)

      if (matchedUser) {
         setSelectedUser(matchedUser)
      }
   }
}, [users])

useEffect(() => {
    if (!socket) return;

    const handler = (newMessage) => {
        // safety — only if message is for me
        if (newMessage.receiverId !== authUser?._id) return;

        if (selectedUser && newMessage.senderId === selectedUser._id) {
            setMessages(prev => [...prev, newMessage]);
            axios.put(`/api/messages/mark/${newMessage._id}`);
            socket.emit("seenMessage",{senderId:newMessage.senderId})
        } else {
            setUnSeenMessages(prev => ({
                ...(prev || {}),
                [newMessage.senderId]: ((prev || {})[newMessage.senderId] || 0) + 1
            }));
        }
    };

    const statusHandler = ({ messageId, status }) => {
        setMessages(prev =>
            prev.map(m =>
                m._id === messageId ? { ...m, status } : m
            )
        );
    };
const seenHandler = ({ receiverId }) => {
  console.log("LIVE SEEN EVENT:", receiverId)

  setMessages(prev =>
    prev.map(m =>
      m.senderId?.toString() === authUser._id?.toString() &&
      m.receiverId?.toString() === receiverId?.toString()
        ? { ...m, status: "seen" }
        : m
    )
  );
};

socket.on("messageReactionUpdate",({messageId,reactions})=>{
      console.log("REACTION SOCKET EVENT:", messageId, reactions);
    setMessages((preMessages)=>preMessages.map((msg)=>msg._id === messageId
    ? {...msg,reactions}
    :msg
))
});
    socket.off("newMessage");
    socket.off("messagesSeen");
    socket.off("typing");
    socket.off("stop typing");
    socket.off("messageStatusUpdate");

    socket.on("newMessage", handler);
    socket.on("messagesSeen", seenHandler);
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
    socket.on("messageStatusUpdate", statusHandler);

    return () => {
        socket.off("newMessage", handler);
        socket.off("messagesSeen", seenHandler);
        socket.off("typing");
        socket.off("stop typing");
        socket.off("messageStatusUpdate", statusHandler);
        socket.off("messageReactionUpdate")
    };

}, [socket, selectedUser, authUser]);

    const value = {
        messages, users, selectedUser, getUsers, getMessages, sendMessage, setSelectedUser,
        UnseenMessages, setUnSeenMessages, isTyping,setMessages
    }

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}
