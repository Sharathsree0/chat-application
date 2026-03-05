import React, { useContext, useState, useEffect } from 'react'
import assets from '../assets/assets'
import { ChatContext } from '../context/chatContext'
import { AuthContext } from '../context/authContext'
import { LogOut, ImageIcon, X } from 'lucide-react'

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext)
  const { logout, onlineUser } = useContext(AuthContext)
  const [msgImages, setMsgImages] = useState([])
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    const safe = Array.isArray(messages) ? messages : []
    setMsgImages(safe.filter(m => m.image).map(m => m.image))
  }, [messages])

  if (!selectedUser) return null

  const isOnline = onlineUser.includes(selectedUser._id)

  return (
    <div className='bg-[#0d0d14] text-white w-full flex flex-col max-md:hidden border-l border-white/5'>
      
      {/* Profile section */}
      <div className='flex flex-col items-center gap-3 pt-10 pb-6 px-5 border-b border-white/5'>
        <div className='relative'>
          <img
            src={selectedUser?.profilePic || assets.avatar_icon}
            alt=""
            className='w-20 h-20 rounded-2xl object-cover ring-2 ring-violet-500/30'
          />
          {isOnline && (
            <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#0d0d14]"></span>
          )}
        </div>

        <div className='text-center'>
          <h2 className='text-base font-semibold text-white'>{selectedUser.fullName}</h2>
          <p className={`text-xs mt-1 ${isOnline ? 'text-emerald-400' : 'text-gray-500'}`}>
            {isOnline ? '● Online' : '○ Offline'}
          </p>
        </div>

        {selectedUser.bio && (
          <p className='text-xs text-gray-400 text-center leading-relaxed max-w-[180px] bg-white/5 rounded-xl px-3 py-2'>
            {selectedUser.bio}
          </p>
        )}
      </div>

      {/* Media section */}
      <div className='flex-1 overflow-y-auto px-4 py-5'>
        <div className='flex items-center gap-2 mb-3'>
          <ImageIcon size={13} className='text-gray-500' />
          <p className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Shared Media</p>
          {msgImages.length > 0 && (
            <span className='ml-auto text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full'>
              {msgImages.length}
            </span>
          )}
        </div>

        {msgImages.length > 0 ? (
          <div className='grid grid-cols-2 gap-2'>
            {msgImages.map((url, i) => (
              <div
                key={i}
                onClick={() => setLightbox(url)}
                className='aspect-square rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-violet-500/50 transition group relative bg-white/5'
              >
                <img src={url} alt="" className='w-full h-full object-cover group-hover:scale-105 transition duration-300' />
              </div>
            ))}
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center py-10 text-center'>
            <div className='w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3'>
              <ImageIcon size={20} className='text-gray-600' />
            </div>
            <p className='text-xs text-gray-600'>No shared media yet</p>
          </div>
        )}
      </div>

      {/* Logout */}
      <div className='p-4 border-t border-white/5'>
        <button
          onClick={logout}
          className='w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-medium transition'
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className='fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6'
          onClick={() => setLightbox(null)}
        >
          <button className='absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition'>
            <X size={16} className='text-white' />
          </button>
          <img
            src={lightbox}
            className='max-w-full max-h-full rounded-2xl shadow-2xl object-contain'
            onClick={(e) => e.stopPropagation()}
            alt=""
          />
        </div>
      )}
    </div>
  )
}

export default RightSidebar
