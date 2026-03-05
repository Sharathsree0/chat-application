import React, { useState, useEffect, useContext } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/authContext'
import { ChatContext } from '../context/chatContext'

const SideBar = ({ sidebarOpen, setSidebarOpen }) => {
  const { getUsers, users, selectedUser, setSelectedUser, UnseenMessages, setUnSeenMessages, messages } = useContext(ChatContext)
  const { logout, onlineUser } = useContext(AuthContext)
  const [input, setInput] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    getUsers();
  }, [onlineUser])

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
    if (bOnline !== aOnline) return bOnline - aOnline
    const aTime = lastMessageTime[a._id] || 0
    const bTime = lastMessageTime[b._id] || 0
    return bTime - aTime
  })

  const filteredUsers = input
    ? users.filter((user) => user.fullName.toLowerCase().includes(input.toLowerCase()))
    : sortedUsers

  const handleSelectUser = (user) => {
    setSelectedUser(user)
    localStorage.setItem("selectedUserId", user._id)
    setUnSeenMessages(prev => ({ ...prev, [user._id]: 0 }))
    if (setSidebarOpen) setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <div className={`
        fixed md:relative top-0 left-0 h-full z-40
        bg-[#111827] md:bg-[#818582]/10
        w-[280px] md:w-full
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        p-5 rounded-r-xl overflow-y-auto text-white
        ${selectedUser ? 'max-md:hidden md:flex' : 'flex'} flex-col
      `}>

        {/* Header */}
        <div className='pb-5 flex-shrink-0'>
          <div className='flex justify-between items-center'>
            <img src={assets.logo} alt="logo" className='w-30' />
            <div className="flex items-center gap-3">
              {/* Close button - mobile only */}
              <button
                className="md:hidden text-gray-400 hover:text-white transition p-1"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Kebab menu */}
              <div className="relative py-2 group">
                <img src={assets.menu_icon} alt="menu" className='w-5 cursor-pointer' />
                <div className='absolute top-full right-0 z-20 w-32 p-5 rounded-md
                  bg-[#282142] border border-gray-600 text-gray-100 hidden group-hover:block'>
                  <p onClick={() => navigate('/profile')} className='cursor-pointer text-sm hover:text-violet-400 transition'>Edit Profile</p>
                  <hr className='my-2 border-t border-gray-500' />
                  <p onClick={() => logout()} className='cursor-pointer text-sm hover:text-red-400 transition'>Logout</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
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

        {/* User list */}
        <div className='flex flex-col flex-1 overflow-y-auto'>
          {filteredUsers.length === 0 && (
            <p className="text-center text-gray-500 text-xs mt-6">No users found</p>
          )}
          {filteredUsers.map((user, index) => (
            <div
              onClick={() => handleSelectUser(user)}
              key={index}
              className={`relative flex items-center gap-2 p-2 pl-4 rounded-lg cursor-pointer transition
                hover:bg-[#282142]/60
                ${selectedUser?._id === user._id ? 'bg-[#282142]/50' : ''}`}
            >
              <div className='relative flex-shrink-0'>
                <img
                  src={user?.profilePic || assets.avatar_icon}
                  alt=""
                  className='w-[38px] h-[38px] rounded-full object-cover'
                />
                {onlineUser.includes(user._id) && (
                  <span className='absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1a1a1a]'></span>
                )}
              </div>

              <div className='flex flex-col leading-5 min-w-0'>
                <p className='truncate text-sm'>{user.fullName}</p>
                {onlineUser.includes(user._id) ? (
                  <span className='text-green-400 text-xs'>Online</span>
                ) : (
                  <span className='text-neutral-400 text-xs'>Offline</span>
                )}
              </div>

              {UnseenMessages?.[user._id] > 0 && (
                <span className='ml-auto flex-shrink-0 min-w-[20px] h-[20px] bg-violet-500 rounded-full flex items-center justify-center text-white text-[10px] font-semibold px-1'>
                  {UnseenMessages[user._id]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default SideBar
