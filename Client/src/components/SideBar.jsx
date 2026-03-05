import React, { useContext, useState, useEffect } from 'react'
import assets from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/authContext'
import { ChatContext } from '../context/chatContext'
import { Search, Settings, LogOut, UserCircle } from 'lucide-react'

const SideBar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, UnseenMessages, setUnSeenMessages } = useContext(ChatContext)
  const { logout, onlineUser } = useContext(AuthContext)
  const [input, setInput] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const filteredUsers = input
    ? users.filter(u => u.fullName.toLowerCase().includes(input.toLowerCase()))
    : users

  useEffect(() => { getUsers() }, [onlineUser])

  return (
    <div className={`bg-[#0d0d14] h-full flex flex-col text-white border-r border-white/5 ${selectedUser ? 'max-md:hidden' : ''}`}>

      {/* Header */}
      <div className='flex items-center justify-between px-4 py-4 border-b border-white/5'>
        <img src={assets.logo} alt="logo" className='h-7 object-contain' />
        <div className='relative'>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className='w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition text-gray-400 hover:text-white'
          >
            <Settings size={15} />
          </button>

          {menuOpen && (
            <div
              className='absolute top-full right-0 mt-1 w-44 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl p-1 z-20'
              onClick={() => setMenuOpen(false)}
            >
              <button
                onClick={() => navigate('/profile')}
                className='w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 text-sm transition'
              >
                <UserCircle size={14} />
                Edit Profile
              </button>
              <hr className='border-white/5 my-1' />
              <button
                onClick={logout}
                className='w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 text-sm transition'
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      <div className='px-4 py-3'>
        <div className='flex items-center gap-2 bg-[#1e1e30] border border-white/5 rounded-xl px-3 py-2 focus-within:border-violet-500/40 transition'>
          <Search size={13} className='text-gray-600 flex-shrink-0' />
          <input
            onChange={(e) => setInput(e.target.value)}
            value={input}
            type="text"
            className='bg-transparent text-sm outline-none text-white placeholder-gray-600 flex-1'
            placeholder='Search conversations...'
          />
          {input && (
            <button onClick={() => setInput("")} className='text-gray-600 hover:text-gray-400 transition'>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Section label */}
      <p className='text-[10px] uppercase tracking-widest text-gray-600 px-5 mb-2'>
        {input ? `Results (${filteredUsers.length})` : 'Messages'}
      </p>

      {/* Users list */}
      <div className='flex-1 overflow-y-auto px-2 pb-4'>
        {filteredUsers.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center px-4'>
            <p className='text-sm text-gray-600'>No users found</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isOnline = onlineUser.includes(user._id)
            const unread = UnseenMessages?.[user._id] || 0
            const isSelected = selectedUser?._id === user._id

            return (
              <button
                key={user._id}
                onClick={() => {
                  setSelectedUser(user)
                  localStorage.setItem("selectedUserId", user._id)
                  setUnSeenMessages(prev => ({ ...prev, [user._id]: 0 }))
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition mb-0.5 group
                  ${isSelected ? 'bg-violet-500/15 border border-violet-500/20' : 'hover:bg-white/5 border border-transparent'}`}
              >
                {/* Avatar */}
                <div className='relative flex-shrink-0'>
                  <img
                    src={user?.profilePic || assets.avatar_icon}
                    alt=""
                    className='w-10 h-10 rounded-xl object-cover'
                  />
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0d0d14]"></span>
                  )}
                </div>

                {/* Info */}
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between gap-2'>
                    <span className={`text-sm font-medium truncate ${isSelected ? 'text-violet-300' : 'text-gray-200'}`}>
                      {user.fullName}
                    </span>
                    {unread > 0 && (
                      <span className='flex-shrink-0 w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] font-bold flex items-center justify-center'>
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${isOnline ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {isOnline ? 'Active now' : 'Offline'}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default SideBar
