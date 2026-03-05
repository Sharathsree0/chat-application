import React from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from '../context/authContext'
import { ChatContext } from '../context/chatContext'
import { useState } from 'react'
import { useEffect } from 'react'

const SideBar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, UnseenMessages, setUnSeenMessages, messages } = useContext(ChatContext)
  const { logout, onlineUser } = useContext(AuthContext)
  const [input, setInput] = useState("")

  useEffect(() => {
    getUsers();
  }, [onlineUser])

  // Build a map of userId -> latest message timestamp from current chat
  // For full recent-chat sorting, ideally the backend returns lastMessageAt per user.
  // This uses whatever messages are loaded in context as a best-effort sort.
  const lastMessageTime = {}
  if (messages?.length) {
    messages.forEach((msg) => {
      const otherId = msg.senderId
      if (otherId) {
        const t = new Date(msg.createdAt).getTime()
        if (!lastMessageTime[otherId] || t > lastMessageTime[otherId]) {
          lastMessageTime[otherId] = t
        }
      }
    })
  }

  const sortedUsers = [...users].sort((a, b) => {
    const aOnline = onlineUser.includes(a._id) ? 1 : 0
    const bOnline = onlineUser.includes(b._id) ? 1 : 0
    // Online users first
    if (bOnline !== aOnline) return bOnline - aOnline
    // Then by most recent message
    const aTime = lastMessageTime[a._id] || 0
    const bTime = lastMessageTime[b._id] || 0
    return bTime - aTime
  })

  const filteredUsers = input
    ? users.filter((user) => user.fullName.toLowerCase().includes(input.toLowerCase()))
    : sortedUsers

  const navigate = useNavigate();

  return (
    <div className={`bg-[#818582]/10 h-full p-5 rounded-r-xl overflow-y-scroll text-white ${selectedUser ? 'max-md:hidden' : ''}`}>
      <div className='pb-5'>
        <div className='flex justify-between items-center'>
          <img src={assets.logo} alt="logo" className='w-30' />
          <div className="relative py-2 group">
            <img src={assets.menu_icon} alt="menu" className='w-5 cursor-pointer' />
            <div className='absolute top-full right-0 z-20 w-32 p-5 rounded-md
              bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block'>
              <p onClick={() => navigate('/profile')} className='cursor-pointer text-sm'>Edit Profile</p>
              <hr className='my-2 border-t border-gray-500' />
              <p onClick={() => logout()} className='cursor-pointer text-sm'>Logout</p>
            </div>
          </div>
        </div>
        <div className='bg-[#282142] rounded-full flex items-center gap-2 py-3 px-4 mt-5'>
          <img src={assets.search_icon} alt="search" className='w-3' />
          <input
            onChange={(e) => setInput(e.target.value)}
            value={input}
            type="text"
            className='bg-transparent border-none outline-none text-white text-xs placeholder-[#c8c8c8] flex-1'
            placeholder='search user..'
          />
        </div>
      </div>

      <div className='flex flex-col'>
        {filteredUsers.map((user, index) => (
          <div
            onClick={() => {
              setSelectedUser(user);
              localStorage.setItem("selectedUserId", user._id)
              setUnSeenMessages(prev => ({ ...prev, [user._id]: 0 }))
            }}
            key={index}
            className={`relative flex items-center gap-2 p-2 pl-4 rounded cursor-pointer max-sm:text-sm 
              ${selectedUser?._id === user._id ? 'bg-[#282142]/50' : ''}`}
          >
            {/* Avatar with online dot */}
            <div className='relative'>
              <img
                src={user?.profilePic || assets.avatar_icon}
                alt=""
                className='w-[35px] aspect-[1/1] rounded-full'
              />
              {onlineUser.includes(user._id) && (
                <span className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1a1a1a]'></span>
              )}
            </div>

            <div className='flex flex-col leading-5'>
              <p>{user.fullName}</p>
              {onlineUser.includes(user._id) ? (
                <span className='text-green-400 text-xs'>Online</span>
              ) : (
                <span className='text-neutral-400 text-xs'>Offline</span>
              )}
            </div>

            {UnseenMessages?.[user._id] > 0 && (
              <span className='absolute top-3 right-3 min-w-[18px] h-[18px] bg-violet-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold px-1'>
                {UnseenMessages[user._id]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SideBar
