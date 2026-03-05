import React, { useState, useEffect, useContext } from 'react'
import assets from '../assets/assets'
import { ChatContext } from '../context/chatContext'
import { AuthContext } from '../context/authContext'

const RightSidebar = ({ rightbarOpen, setRightbarOpen }) => {
  const { selectedUser, messages } = useContext(ChatContext)
  const { logout, onlineUser } = useContext(AuthContext)
  const [msgImages, setMsgImages] = useState([])

  useEffect(() => {
    const safeMessages = Array.isArray(messages) ? messages : []
    setMsgImages(
      safeMessages.filter(msg => msg.image).map(msg => msg.image)
    )
  }, [messages])

  if (!selectedUser) return null

  return (
    <>
      {/* Mobile overlay backdrop */}
      {rightbarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setRightbarOpen(false)}
        />
      )}

      {/* Right sidebar panel */}
      <div className={`
        fixed md:relative top-0 right-0 h-full z-40
        bg-[#111827] md:bg-[#818582]/10
        w-[280px] md:w-full
        transform transition-transform duration-300 ease-in-out
        ${rightbarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        text-white overflow-y-auto
        flex flex-col
        max-md:hidden md:flex
      `}>

        {/* Mobile close button */}
        <button
          className="md:hidden absolute top-4 left-4 text-gray-400 hover:text-white transition p-1 z-10"
          onClick={() => setRightbarOpen(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Profile section */}
        <div className='pt-16 flex flex-col items-center gap-2 text-xs font-light mx-auto w-full px-4'>
          <div className="relative">
            <img
              src={selectedUser?.profilePic || assets.avatar_icon}
              alt=""
              className='w-20 h-20 rounded-full object-cover'
            />
            {onlineUser.includes(selectedUser._id) && (
              <span className='absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#111827]'></span>
            )}
          </div>
          <h1 className='text-xl font-medium text-center mt-1'>
            {selectedUser.fullName}
          </h1>
          <p className='text-gray-400 text-center px-4'>{selectedUser.bio}</p>
        </div>

        <hr className="border-[#ffffff20] my-4 mx-4" />

        {/* Media section */}
        <div className="px-5 flex-1">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Media</p>
          {msgImages.length === 0 ? (
            <p className="text-gray-600 text-xs">No media shared yet</p>
          ) : (
            <div className='max-h-[200px] overflow-y-auto grid grid-cols-2 gap-2'>
              {msgImages.map((url, index) => (
                <div
                  key={index}
                  onClick={() => window.open(url)}
                  className='cursor-pointer rounded-lg overflow-hidden hover:opacity-100 opacity-80 transition'
                >
                  <img src={url} alt="" className='w-full h-full object-cover rounded-md' />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout button */}
        <div className="p-5 mt-auto">
          <button
            onClick={() => logout()}
            className='w-full bg-gradient-to-r from-purple-400 to-violet-600 text-white text-sm font-light py-2.5 px-6 rounded-full cursor-pointer hover:opacity-90 transition'
          >
            Logout
          </button>
        </div>
      </div>
    </>
  )
}

export default RightSidebar
