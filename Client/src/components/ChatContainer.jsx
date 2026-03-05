import { useEffect, useRef, useState, useContext } from 'react'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utilis'
import { ChatContext } from '../context/chatContext.jsx'
import { AuthContext } from '../context/authContext'
import toast from 'react-hot-toast'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone, PhoneIncoming, X, Smile } from "lucide-react"
import axios from 'axios'
import { useCall } from "../context/useCall.js"

// ── helpers ──────────────────────────────────────────────────────────────────
const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

const groupByDate = (messages) => {
  const groups = []
  let lastLabel = null
  messages.forEach((msg) => {
    const label = msg.createdAt ? formatDateLabel(msg.createdAt) : null
    if (label && label !== lastLabel) {
      groups.push({ type: 'date', label })
      lastLabel = label
    }
    groups.push({ type: 'msg', msg })
  })
  return groups
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"]

// ── component ─────────────────────────────────────────────────────────────────
const ChatContainer = () => {
  const scrollEnd = useRef()
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const [editingMsgId, setEditingMsgId] = useState(null)
  const [editText, setEditText] = useState("")
  const remoteVideoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const [recording, setRecording] = useState(false)
  const [oldInput, setOldInput] = useState("")
  const [showDecline, setShowDecline] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [menuMsgId, setMenuMsgId] = useState(null)
  const [emojiPickerMsgId, setEmojiPickerMsgId] = useState(null)

  const { users, messages, selectedUser, setSelectedUser, sendMessage, isTyping, setMessages } = useContext(ChatContext)
  const { authUser, onlineUser, socket } = useContext(AuthContext)
  const { call, startCall, acceptCall, endCall, toggleMute, toggleVideo } = useCall(socket, selectedUser)

  // ── AI handlers ──────────────────────────────────────────────────────────
  const aiPost = async (url, body) => {
    try {
      setAiLoading(true); setShowMenu(false)
      const { data } = await axios.post(url, body)
      if (data.success) { setOldInput(input); setInput(data.result); setShowDecline(true) }
    } catch { toast.error("AI failed") } finally { setAiLoading(false) }
  }
  const handleAiRephrase = () => aiPost("/api/ai/rephrase", { text: input })
  const summarizingHandler = () => aiPost("/api/ai/summarizes", { text: input })
  const handleSoftenText = () => aiPost("/api/ai/soften", { text: input })
  const handleToneChange = (tone) => aiPost("/api/ai/tone", { text: input, tone })
  const handleSmartReply = async () => {
    try {
      setAiLoading(true); setShowMenu(false)
      const lastMessages = messages.slice(-5).map(m => m.text).join("\n")
      const { data } = await axios.post("/api/ai/smart-reply", { conversation: lastMessages })
      if (data.success) console.log(data.replies)
    } catch { toast.error("AI failed") } finally { setAiLoading(false) }
  }

  // ── recording ────────────────────────────────────────────────────────────
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
    mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = []
    mediaRecorder.start(); setRecording(true)
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
  }
  const stopRecording = () => {
    if (!mediaRecorderRef.current) return
    setRecording(false)
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
      if (!blob.size) return
      const reader = new FileReader()
      reader.onloadend = async () => { await sendMessage({ audio: reader.result }); audioChunksRef.current = [] }
      reader.readAsDataURL(blob)
    }
  }

  // ── message actions ──────────────────────────────────────────────────────
  const handleSendReaction = async (messageId, emoji) => {
    await axios.post(`/api/messages/react/${messageId}`, { emoji })
    setMenuMsgId(null); setEmojiPickerMsgId(null)
  }
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    await sendMessage({ text: input.trim() })
    setInput(""); setShowDecline(false)
  }
  const handleSendImage = async (e) => {
    const file = e.target.files[0]
    if (!file || !file.type.startsWith("image/")) { toast.error("Select an image file"); return }
    const reader = new FileReader()
    reader.onloadend = async () => { await sendMessage({ image: reader.result }); e.target.value = "" }
    reader.readAsDataURL(file)
  }

  // ── effects ──────────────────────────────────────────────────────────────
  useEffect(() => { scrollEnd.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  useEffect(() => { if (remoteVideoRef.current && call.remoteStream) remoteVideoRef.current.srcObject = call.remoteStream }, [call.remoteStream])
  useEffect(() => {
    if (!socket) return
    const handleEdit = (u) => setMessages(p => p.map(m => m._id === u._id ? u : m))
    const handleDelete = ({ messageId }) => setMessages(p => p.map(m => m._id === messageId ? { ...m, isDeleted: true, text: "", image: "" } : m))
    socket.on("messageEdited", handleEdit); socket.on("messageDeleted", handleDelete)
    return () => { socket.off("messageEdited", handleEdit); socket.off("messageDeleted", handleDelete) }
  }, [socket])
  useEffect(() => {
    const id = localStorage.getItem("selectedUserId")
    if (id && users?.length) { const u = users.find(u => u._id === id); if (u) setSelectedUser(u) }
  }, [users])

  const grouped = groupByDate(messages)
  const isOnline = onlineUser?.includes(selectedUser?._id)

  // ═══════════════════════════════════════════════════════════════════════════
  if (!selectedUser) return (
    <div className='flex flex-col items-center justify-center gap-3 bg-[#0d0d14] max-md:hidden h-full'>
      <div className='w-16 h-16 rounded-2xl bg-violet-500/20 flex items-center justify-center'>
        <img src={assets.logo_icon} alt="" className='w-10' />
      </div>
      <p className='text-lg font-semibold text-white tracking-tight'>Chat anytime, anywhere</p>
      <p className='text-sm text-gray-500'>Select a conversation to start messaging</p>
    </div>
  )

  return (
    <div className='h-full flex flex-col bg-[#0d0d14] relative'>

      {/* ── HEADER ── */}
      <div className='flex items-center gap-3 px-4 py-3 bg-[#13131f] border-b border-white/5 z-10 shadow-lg'>
        <button onClick={() => setSelectedUser(null)} className='md:hidden text-gray-400 hover:text-white transition mr-1'>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <div className='relative'>
          <img src={selectedUser.profilePic || assets.avatar_icon} alt="" className='w-9 h-9 rounded-full object-cover ring-2 ring-violet-500/30' />
          {isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#13131f]"></span>}
        </div>
        <div className='flex-1 min-w-0'>
          <p className='text-sm font-semibold text-white truncate'>{selectedUser.fullName}</p>
          <p className={`text-xs ${isOnline ? 'text-emerald-400' : 'text-gray-500'}`}>{isOnline ? 'Online' : 'Offline'}</p>
        </div>
        <div className='flex items-center gap-1'>
          <button onClick={() => startCall("audio")} className='w-8 h-8 rounded-lg bg-white/5 hover:bg-violet-500/20 hover:text-violet-400 text-gray-400 transition flex items-center justify-center max-md:hidden'>
            <Phone size={15} />
          </button>
          <button onClick={() => startCall("video")} className='w-8 h-8 rounded-lg bg-white/5 hover:bg-violet-500/20 hover:text-violet-400 text-gray-400 transition flex items-center justify-center max-md:hidden'>
            <Video size={15} />
          </button>
        </div>
      </div>

      {/* ── INCOMING CALL BANNER ── */}
      {call.status === "ringing" && call.incoming && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-violet-500/30 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-5 w-72 animate-in fade-in zoom-in-95 duration-200">
            <div className='relative'>
              <img src={call.incoming.profilePic} className="w-20 h-20 rounded-full object-cover ring-4 ring-violet-500/40" alt="" />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                <PhoneIncoming size={12} className="text-white" />
              </span>
            </div>
            <div className='text-center'>
              <p className='text-white font-semibold text-lg'>{call.incoming.callerName}</p>
              <p className='text-gray-400 text-sm mt-1 flex items-center justify-center gap-2'>
                <span className='w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse'></span>
                Incoming {call.incoming.callType} call
              </p>
            </div>
            <div className="flex gap-5 mt-2">
              <button onClick={endCall} className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 transition flex items-center justify-center shadow-lg shadow-red-500/30">
                <PhoneOff size={22} className="text-white" />
              </button>
              <button onClick={acceptCall} className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 transition flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Phone size={22} className="text-white" />
              </button>
            </div>
            <p className='text-xs text-gray-500 -mt-2'>Tap green to accept</p>
          </div>
        </div>
      )}

      {/* ── ACTIVE CALL OVERLAY ── */}
      {call.type && (
        <div className="fixed inset-0 bg-[#070710] z-50 flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-10 pb-4">
            <div>
              <h2 className="text-white text-xl font-semibold">{call.activeUser?.fullName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse'></span>
                <p className="text-sm text-gray-400">
                  {call.status === "calling" && "Calling..."}
                  {call.status === "ringing" && "Ringing..."}
                  {call.status === "connected" && (call.type === "audio" ? "Audio call in progress" : "Video call in progress")}
                </p>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="flex-1 flex items-center justify-center">
            {call.type === "video" && call.status === "connected" ? (
              <div className="relative w-full h-full">
                {call.remoteStream ? (
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500 animate-pulse">Waiting for video...</div>
                )}
                {call.localStream && (
                  <video autoPlay playsInline muted
                    className="absolute bottom-4 right-4 w-28 h-36 rounded-xl border-2 border-white/20 object-cover shadow-xl"
                    ref={(v) => { if (v) v.srcObject = call.localStream }} />
                )}
              </div>
            ) : call.type === "video" && call.status !== "connected" ? (
              <div className="flex flex-col items-center gap-4">
                <img src={call.activeUser?.profilePic} className="w-32 h-32 rounded-full ring-4 ring-violet-500/40" alt="" />
                <p className="text-gray-400 animate-pulse">Connecting...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className='relative'>
                  <div className='absolute inset-0 rounded-full bg-violet-500/20 animate-ping scale-150'></div>
                  <img src={call.activeUser?.profilePic} className="w-32 h-32 rounded-full ring-4 ring-violet-500/40 relative z-10" alt="" />
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-5 pb-12">
            <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${call.muted ? "bg-red-500 shadow-red-500/30" : "bg-white/10 hover:bg-white/20"}`}>
              {call.muted ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
            </button>
            <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg shadow-red-500/30">
              <PhoneOff size={24} className="text-white" />
            </button>
            {call.type === "video" && (
              <button onClick={toggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${!call.videoEnabled ? "bg-red-500 shadow-red-500/30" : "bg-white/10 hover:bg-white/20"}`}>
                {call.videoEnabled ? <Video size={22} className="text-white" /> : <VideoOff size={22} className="text-white" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div className='flex-1 overflow-y-auto px-4 py-4 space-y-1' onClick={() => { setMenuMsgId(null); setEmojiPickerMsgId(null) }}>
        {grouped.map((item, i) => {
          if (item.type === 'date') return (
            <div key={i} className='flex items-center gap-3 my-4'>
              <div className='flex-1 h-px bg-white/5'></div>
              <span className='text-xs text-gray-500 px-3 py-1 bg-white/5 rounded-full'>{item.label}</span>
              <div className='flex-1 h-px bg-white/5'></div>
            </div>
          )

          const { msg } = item
          const isMe = msg.senderId === authUser._id
          const isCallMsg = msg.text?.startsWith("__CALL__")
          const groupReaction = {}
          msg.reactions?.forEach(r => { groupReaction[r.emoji] = (groupReaction[r.emoji] || 0) + 1 })

          if (isCallMsg) return (
            <div key={msg._id} className="flex justify-center my-3">
              <span className="text-xs text-gray-500 bg-white/5 px-4 py-1.5 rounded-full flex items-center gap-2">
                <Phone size={11} />
                {msg.text.replace("__CALL__", "")}
              </span>
            </div>
          )

          return (
            <div key={msg._id} className={`group flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} mb-1`}>
              {/* Avatar */}
              <img
                src={isMe ? authUser?.profilePic || assets.avatar_icon : selectedUser?.profilePic || assets.avatar_icon}
                className='w-6 h-6 rounded-full object-cover flex-shrink-0 mb-5 opacity-80'
                alt=""
              />

              {/* Bubble + meta */}
              <div className={`relative max-w-[65%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {/* Bubble */}
                <div
                  className={`relative rounded-2xl px-3 py-2 cursor-pointer select-none
                    ${isMe
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-[#1e1e30] text-gray-100 rounded-bl-sm border border-white/5'}
                    ${msg.isDeleted ? 'opacity-50' : ''}
                  `}
                  onContextMenu={(e) => { e.preventDefault(); setMenuMsgId(msg._id) }}
                >
                  {msg.image ? (
                    <img src={msg.image} alt="" className='max-w-[200px] rounded-xl block' />
                  ) : msg.audio ? (
                    <audio controls className="w-48 h-8"><source src={msg.audio} type="audio/webm" /></audio>
                  ) : (
                    <div>
                      {editingMsgId === msg._id ? (
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") { await axios.put(`/api/messages/edit/${msg._id}`, { content: editText }); setEditingMsgId(null) }
                            if (e.key === "Escape") setEditingMsgId(null)
                          }}
                          className="bg-transparent border-b border-white/40 outline-none text-white text-sm w-full"
                          autoFocus
                        />
                      ) : msg.isDeleted ? (
                        <span className="italic text-xs text-gray-400">Message deleted</span>
                      ) : (
                        <span className="text-sm leading-relaxed">{msg.text}</span>
                      )}
                    </div>
                  )}

                  {/* Inline emoji picker trigger */}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEmojiPickerMsgId(emojiPickerMsgId === msg._id ? null : msg._id) }}
                    className={`absolute -top-3 ${isMe ? '-left-6' : '-right-6'} opacity-0 group-hover:opacity-100 transition w-6 h-6 bg-[#1e1e30] border border-white/10 rounded-full text-xs flex items-center justify-center hover:bg-violet-500/20`}
                  >
                    <Smile size={11} className="text-gray-400" />
                  </button>
                </div>

                {/* Emoji picker */}
                {emojiPickerMsgId === msg._id && (
                  <div
                    className={`absolute -top-10 ${isMe ? 'right-0' : 'left-0'} z-30 flex gap-1 bg-[#1a1a2e] border border-white/10 rounded-full px-2 py-1 shadow-xl`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {EMOJIS.map(emoji => (
                      <button key={emoji} onClick={() => handleSendReaction(msg._id, emoji)}
                        className="text-lg hover:scale-125 transition-transform cursor-pointer">
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {/* Reactions */}
                {Object.keys(groupReaction).length > 0 && (
                  <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(groupReaction).map(([emoji, count]) => (
                      <span key={emoji} className='text-xs bg-white/10 border border-white/10 rounded-full px-2 py-0.5 flex items-center gap-1 cursor-pointer hover:bg-white/15 transition'>
                        {emoji}{count > 1 && <span className='text-gray-400'>{count}</span>}
                      </span>
                    ))}
                  </div>
                )}

                {/* Time + status */}
                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <span className='text-[10px] text-gray-600'>
                    {msg.createdAt ? formatMessageTime(msg.createdAt) : "sending..."}
                  </span>
                  {isMe && !msg.isDeleted && (
                    <span className={`text-[10px] ${msg.status === 'seen' ? 'text-violet-400' : 'text-gray-600'}`}>
                      {msg.status === "sent" && "✓"}
                      {msg.status === "delivered" && "✓✓"}
                      {msg.status === "seen" && "✓✓"}
                    </span>
                  )}
                  {msg.editedAt && <span className='text-[10px] text-gray-600 italic'>edited</span>}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping && (
          <div className='flex items-end gap-2'>
            <img src={selectedUser?.profilePic || assets.avatar_icon} className='w-6 h-6 rounded-full flex-shrink-0' alt="" />
            <div className='bg-[#1e1e30] border border-white/5 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1'>
              <span className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce'></span>
              <span className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.15s]'></span>
              <span className='w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.3s]'></span>
            </div>
          </div>
        )}
        <div ref={scrollEnd} />
      </div>

      {/* ── CONTEXT MENU ── */}
      {menuMsgId && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuMsgId(null)}>
          <div
            className="absolute bottom-24 right-4 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl p-1 w-44 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            {[
              { label: "React", action: () => { setEmojiPickerMsgId(menuMsgId); setMenuMsgId(null) }, icon: "😊" },
              { label: "Copy", action: () => { navigator.clipboard.writeText(messages.find(m => m._id === menuMsgId)?.text || ""); setMenuMsgId(null) }, icon: "📋" },
              { label: "Edit", action: () => { const m = messages.find(m => m._id === menuMsgId); setEditingMsgId(menuMsgId); setEditText(m.text); setMenuMsgId(null) }, icon: "✏️" },
              { label: "Delete", action: async () => { await axios.delete(`/api/messages/delete/${menuMsgId}`); setMenuMsgId(null) }, icon: "🗑️", danger: true },
            ].map(item => (
              <button key={item.label} onClick={item.action}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${item.danger ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-white/5 text-gray-300'}`}>
                <span className='text-base'>{item.icon}</span>{item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div className='px-4 py-3 bg-[#13131f] border-t border-white/5'>
        {/* Decline AI suggestion */}
        {showDecline && (
          <div className='flex items-center gap-2 mb-2 text-xs text-gray-400'>
            <span className='flex-1 truncate'>AI suggestion applied</span>
            <button onClick={() => { setInput(oldInput); setShowDecline(false) }}
              className='text-red-400 hover:text-red-300 transition px-2 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20'>
              Undo
            </button>
          </div>
        )}

        <div className='flex items-center gap-2'>
          {/* Input area */}
          <div className='flex-1 flex items-center bg-[#1e1e30] border border-white/5 rounded-xl px-3 gap-2 focus-within:border-violet-500/40 transition'>
            <input
              onChange={(e) => {
                setInput(e.target.value)
                if (!typing) {
                  setTyping(true); socket.emit("typing", selectedUser._id)
                  setTimeout(() => { socket.emit("stop typing", selectedUser._id); setTyping(false) }, 3000)
                }
              }}
              value={input}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage(e)}
              type="text"
              placeholder="Type a message..."
              className='flex-1 bg-transparent text-sm py-3 outline-none text-white placeholder-gray-600'
            />

            {aiLoading && <span className="text-xs text-violet-400 animate-pulse whitespace-nowrap">Generating...</span>}

            {/* Recording button */}
            <div className='relative'>
              <button
                onClick={() => recording ? stopRecording() : startRecording()}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${recording ? 'bg-red-500/20 text-red-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                {recording ? <MicOff size={14} /> : <Mic size={14} />}
              </button>
              {recording && <span className='absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-red-400 whitespace-nowrap'>● REC</span>}
            </div>

            {/* AI menu button */}
            <div className='relative'>
              <button onClick={() => setShowMenu(!showMenu)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition text-xs ${showMenu ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}>
                ✨
              </button>

              {showMenu && (
                <div className="absolute bottom-10 right-0 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl text-sm text-white p-1 w-52 z-50">
                  {[
                    { label: "Fix Grammar", icon: "✨", fn: handleAiRephrase },
                    { label: "Summarize", icon: "🪄", fn: summarizingHandler },
                    { label: "Make Formal", icon: "🎭", fn: () => handleToneChange("formal") },
                    { label: "Make Friendly", icon: "😊", fn: () => handleToneChange("friendly") },
                    { label: "Soften Tone", icon: "🤝", fn: handleSoftenText },
                    { label: "Smart Reply", icon: "💬", fn: handleSmartReply },
                  ].map(item => (
                    <button key={item.label} onClick={item.fn}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 text-gray-300 text-left transition">
                      <span>{item.icon}</span>{item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Image upload */}
            <label htmlFor="image" className='cursor-pointer text-gray-500 hover:text-gray-300 transition'>
              <input onChange={handleSendImage} type="file" id="image" accept="image/png, image/jpeg" hidden />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </label>
          </div>

          {/* Send button */}
          <button onClick={handleSendMessage}
            className='w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 transition flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20 disabled:opacity-40'
            disabled={!input.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatContainer
