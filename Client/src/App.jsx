import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Homepage from './pages/Homepage'
import Loginpage from './pages/Loginpage'
import Profilepage from './pages/Profilepage'
import {Toaster} from "react-hot-toast"
import { useContext } from 'react'
import { AuthContext } from './context/authContext'
import { ChatContext } from './context/chatContext'
 
function App() {
  const {authUser,globalIncomingCall, setGlobalIncomingCall}=useContext(AuthContext)
const { setSelectedUser,selectedUser  } = useContext(ChatContext);

  return (
    <div className="bg-[url('./src/assets/bgimage.svg')] bg-contain bg-black bg-no-repeat bg-center">
      <Toaster/>
      {globalIncomingCall &&
 selectedUser?._id !== globalIncomingCall.callerId && (

  <div
    onClick={() => {
      setSelectedUser({
        _id: globalIncomingCall.callerId,
        fullName: globalIncomingCall.callerName,
        profilePic: globalIncomingCall.profilePic
      });
      setGlobalIncomingCall(null);
    }}
    className="fixed top-6 left-1/2 -translate-x-1/2 
               bg-gray-900 text-white px-6 py-3 
               rounded-full shadow-lg z-50 
               cursor-pointer hover:scale-105 transition"
  >
    <span className="font-medium">
      {globalIncomingCall.callerName}
    </span>
    <span className="ml-2 text-sm text-gray-400">
      Incoming {globalIncomingCall.callType} call
    </span>
  </div>

)}


      <Routes>
          <Route path='/' element={authUser ? <Homepage/>:<Navigate to="/login"/>}/>
          <Route path='/login' element={!authUser ? <Loginpage/> :<Navigate to="/"/>}/>
          <Route path='/Profile' element={authUser ? <Profilepage/> :<Navigate to="/login"/>}/>
      </Routes>
    </div>
  )
}

export default App