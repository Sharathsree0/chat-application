import axios from "axios";
import { useEffect, useState, createContext } from "react";
import toast from "react-hot-toast";
import { io } from "socket.io-client"
import assets from "../assets/assets";

const backenUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backenUrl
axios.defaults.withCredentials = true
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    const [authUser, setAuthUser] = useState(null);
    const [onlineUser, setOnlineUser] = useState([]);
    const [socket, setSocket] = useState(null);
    const [globalIncomingCall, setGlobalIncomingCall] = useState(null);


    //check the user is authenticated if so then user data connect the socket

    const checkAuth = async () => {
        try {
            const { data } = await axios.get("/api/auth/check");
            if (data.success) {
                setAuthUser(data.user)
                connectSocket(data.user)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }
    //login fun to handle user auth and socket connection
    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials)
            if (data.success) {
                setAuthUser(data.userData);
                connectSocket(data.userData);
                toast.success(data.message)
                return true;
            } else {
                return false;
                toast.error(data.message)
            }
        } catch (error) {
            toast.success("login failed")
            toast.error(error.message)
        }

    }

    //logout to disconnect socket
    const logout = async () => {
        setAuthUser(null);
        setOnlineUser([]);
        socket?.disconnect();
        toast.success("Logged out successfully")
    }

    // profile updates handling function 
    const updateProfile = async (body) => {
        try {
            const { data } = await axios.put("/api/auth/update-profile", body)
            if (data.success) {
                setAuthUser(data.user);
                toast.success('Profile updated successfully')
                return true;
            }
            return false;
        } catch (error) {
            toast.error(error.message)
            return false;
        }
    }

    //now the function to handle the socket connection and users updates.
    const connectSocket = (userData) => {
        if (!userData || socket?.connected) return;
        const newSocket = io(backenUrl, {
            query: {
                userId: userData._id,
                fullName: userData.fullName,
                profilePic: userData.profilePic
            }
        });
        newSocket.connect();
        setSocket(newSocket);

        newSocket.on("getOnlineUsers", (userIds) => {
            setOnlineUser(userIds);
        })
        newSocket.on("incomingCall", (data) => {
            setGlobalIncomingCall(data);

            const audio = new Audio(assets.ringtone);
            audio.loop = true;
            audio.play();
            window.__ringtone = audio;
        });
        newSocket.on("callAnswered", () => {
            if (window.__ringtone) {
                window.__ringtone.pause();
                window.__ringtone.currentTime = 0;
                window.__ringtone = null;
            }
        });

        newSocket.on("callEnded", () => {
            if (window.__ringtone) {
                window.__ringtone.pause();
                window.__ringtone.currentTime = 0;
                window.__ringtone = null;
            }
        });


    }
    useEffect(() => {
        checkAuth();
    }, [])
    const value = {
        axios,
        authUser,
        onlineUser,
        socket,
        login,
        logout,
        updateProfile,
        globalIncomingCall,
        setGlobalIncomingCall
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}