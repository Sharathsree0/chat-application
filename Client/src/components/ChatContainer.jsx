import { useEffect, useRef, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import assets from '../assets/assets'
import { formatMessageTime } from '../lib/utilis'
import { ChatContext } from '../context/chatContext.jsx'
import { AuthContext } from '../context/authContext'
import toast from 'react-hot-toast'
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import axios from 'axios'
import { useCall } from "../context/useCall.js";

const Chatcontainer = ({ setSidebarOpen, setRightbarOpen }) => {

    const scrollEnd = useRef()
    const [input, setInput] = useState("")

    const [typing, setTyping] = useState(false)
    const [editingMsgId, setEditingMsgId] = useState(null)
    const [editText, setEditText] = useState("")

    const remoteVideoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const [recording, setRecording] = useState(false);

    const [oldInput, setOldInput] = useState("")
    const [showDecline, setShowDecline] = useState(false)
    const [aiLoading, setAiLoading] = useState(false)
    const [showMenu, setShowMenu] = useState(false)

    const [menuMsgId, setMenuMsgId] = useState(null)

    const {
        users,
        messages,
        selectedUser,
        setSelectedUser,
        sendMessage,
        isTyping,
        setMessages
    } = useContext(ChatContext)

    const {
        authUser,
        onlineUser,
        socket
    } = useContext(AuthContext)

    const { call, startCall, acceptCall, endCall, toggleMute, toggleVideo } = useCall(socket, selectedUser);
    const navigate = useNavigate();

    // AI handlers
    const handleAiRephrase = async () => {
        if (!input.trim()) return
        try {
            setAiLoading(true)
            setShowMenu(false)
            const { data } = await axios.post("/api/ai/rephrase", { text: input })
            if (data.success) {
                setOldInput(input)
                setInput(data.result)
                setShowDecline(true)
            }
        } catch {
            toast.error("AI failed")
        } finally {
            setAiLoading(false)
        }
    }

    const handleToneChange = async (tone) => {
        if (!input.trim()) return;
        try {
            setAiLoading(true);
            setShowMenu(false);
            const { data } = await axios.post("/api/ai/tone", { text: input, tone });
            if (data.success) {
                setOldInput(input);
                setInput(data.result);
                setShowDecline(true);
            }
        } catch {
            toast.error("AI failed");
        } finally {
            setAiLoading(false);
        }
    };

    const handleSoftenText = async () => {
        if (!input.trim()) return;
        try {
            setAiLoading(true);
            setShowMenu(false);
            const { data } = await axios.post("/api/ai/soften", { text: input });
            if (data.success) {
                setOldInput(input);
                setInput(data.result);
                setShowDecline(true);
            }
        } catch {
            toast.error("AI failed");
        } finally {
            setAiLoading(false);
        }
    };

    const handleSmartReply = async () => {
        try {
            setAiLoading(true);
            setShowMenu(false);
            const lastMessages = messages.slice(-5).map(m => m.text).join("\n");
            const { data } = await axios.post("/api/ai/smart-reply", { conversation: lastMessages });
            if (data.success) {
                console.log(data.replies);
            }
        } catch {
            toast.error("AI failed");
        } finally {
            setAiLoading(false);
        }
    };

    const summarizingHandler = async () => {
        if (!input.trim()) return
        try {
            setAiLoading(true)
            setShowMenu(false)
            const { data } = await axios.post("/api/ai/summarizes", { text: input })
            if (data.success) {
                setOldInput(input)
                setInput(data.result)
                setShowDecline(true)
            }
        } catch {
            toast.error("AI failed")
        } finally {
            setAiLoading(false)
        }
    }

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const options = { mimeType: "audio/webm;codecs=opus" };
        const mediaRecorder = new MediaRecorder(stream, options);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.start();
        setRecording(true);
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };
    };

    const stopRecording = () => {
        if (!mediaRecorderRef.current) return;
        setRecording(false);
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.onstop = async () => {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            if (blob.size === 0) return;
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    await sendMessage({ audio: reader.result });
                } catch (err) {
                    console.error("Audio send failed ❌", err);
                }
                audioChunksRef.current = [];
            };
            reader.readAsDataURL(blob);
        };
    };

    const handleSendReaction = async (messageId, emoji) => {
        await axios.post(`/api/messages/react/${messageId}`, { emoji })
        setMenuMsgId(null)
    }

    const handleSendMessage = async (e) => {
        e.preventDefault()
        if (input.trim() === "") return null
        await sendMessage({ text: input.trim() })
        setInput("")
        setShowDecline(false)
    }

    const handleSendImage = async (e) => {
        const file = e.target.files[0]
        if (!file || !file.type.startsWith("image/")) {
            toast.error("select an image file")
            return
        }
        const reader = new FileReader()
        reader.onloadend = async () => {
            await sendMessage({ image: reader.result })
            e.target.value = ""
        }
        reader.readAsDataURL(file)
    }

    useEffect(() => {
        if (scrollEnd.current && messages) {
            scrollEnd.current.scrollIntoView({ behavior: "smooth" })
        }
    }, [messages])

    useEffect(() => {
    if (!remoteVideoRef.current) return;
    if (!call.remoteStream) return;

    remoteVideoRef.current.srcObject = call.remoteStream;
}, [call.remoteStream]);

    useEffect(() => {
        if (!socket) return;
        const handleEdit = (updatedMessage) => {
            setMessages((prev) =>
                prev.map((msg) => msg._id === updatedMessage._id ? updatedMessage : msg)
            );
        };
        const handleDelete = ({ messageId }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === messageId
                        ? { ...msg, isDeleted: true, text: "", image: "" }
                        : msg
                )
            );
        };
        socket.on("messageEdited", handleEdit);
        socket.on("messageDeleted", handleDelete);
        return () => {
            socket.off("messageEdited", handleEdit);
            socket.off("messageDeleted", handleDelete);
        };
    }, [socket]);

    useEffect(() => {
        const storedUserId = localStorage.getItem("selectedUserId");
        if (storedUserId && users?.length) {
            const user = users.find(u => u._id === storedUserId);
            if (user) setSelectedUser(user);
        }
    }, [users]);

    // ── helpers ──────────────────────────────────────────────────────────────
    const selectedMsg = messages.find(m => m._id === menuMsgId)
    const selectedMsgIsMe = selectedMsg?.senderId === authUser._id
    const isCallMsg = (msg) => msg.text?.startsWith("__CALL__")

    return selectedUser ? (
        <div className='h-full overflow-scroll relative backdrop-blur-lg'>

            {/* ── Header ── */}
            <div className='flex items-center gap-3 py-3 mx-4 border-b border-stone-500'>

                {/* Hamburger - mobile only */}
                <button
                    className="md:hidden text-gray-400 hover:text-white transition p-1 flex-shrink-0"
                    onClick={() => setSidebarOpen && setSidebarOpen(true)}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                {/* Profile pic - tapping opens profile page */}
                <img
                    src={selectedUser.profilePic || assets.avatar_icon}
                    alt=""
                    className='w-9 h-9 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition'
                    onClick={() => navigate('/profile')}
                />

                {/* Name + online */}
                <div className='flex-1 min-w-0'>
                    <p className='text-base font-semibold text-white truncate'>{selectedUser.fullName}</p>
                    <p className='text-xs text-gray-400'>
                        {onlineUser?.includes(selectedUser._id)
                            ? <span className="text-green-400">Online</span>
                            : 'Offline'}
                    </p>
                </div>

                {/* Call icons - visible on all screen sizes */}
                <img onClick={() => startCall("audio")} src={assets.Audio_call} alt="audio call" className='w-5 cursor-pointer opacity-80 hover:opacity-100 transition' />
                <img onClick={() => startCall("video")} src={assets.Vide_call} alt="video call" className='w-5 cursor-pointer opacity-80 hover:opacity-100 transition' />

                {/* Info button - opens right sidebar (mobile: slide-in, desktop: always visible) */}
                <button
                    className="text-gray-400 hover:text-white transition p-1 flex-shrink-0"
                    onClick={() => setRightbarOpen && setRightbarOpen(true)}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" strokeWidth={2} />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-4M12 8h.01" />
                    </svg>
                </button>
            </div>

            {/* ── Incoming call overlay ── */}
            {call.status === "ringing" && call.incoming && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white z-50">
                    <img src={call.incoming.profilePic} className="w-28 h-28 rounded-full mb-4" />
                    <h2 className="text-xl font-semibold">{call.incoming.callerName}</h2>
                    <p className="mt-2">Incoming {call.incoming.callType} call...</p>
                    <div className="flex gap-6 mt-8">
                        <button onClick={endCall} className="bg-red-600 p-4 rounded-full">Decline</button>
                        <button onClick={acceptCall} className="bg-green-600 p-4 rounded-full">Accept</button>
                    </div>
                </div>
            )}

            {/* ── Active call screen ── */}
            {call.type && (
                <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between items-center p-6">
                    <div className="text-white text-center mt-10">
                        <h2 className="text-xl font-semibold">{call.activeUser?.fullName}</h2>
                        <p className="text-sm text-gray-400">
                            {call.status === "calling" && "Calling..."}
                            {call.status === "ringing" && "Incoming call..."}
                            {call.status === "connected" && (call.type === "audio" ? "Audio Call" : "Video Call")}
                        </p>
                    </div>
                    <div className="flex-1 flex items-center justify-center w-full">

                        {/* VIDEO CALL - connected */}
                        {call.type === "video" && (
                            <div className="relative w-full h-full flex items-center justify-center bg-black">
                                {/* Remote stream - main large view */}
                                {call.remoteStream ? (
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover rounded-xl"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-3 text-white animate-pulse">
                                        <img src={call.activeUser?.profilePic || assets.avatar_icon} className="w-24 h-24 rounded-full" />
                                        <p>Waiting for video...</p>
                                    </div>
                                )}
                                {/* Local stream - picture-in-picture */}
                                <video
                                    autoPlay
                                    playsInline
                                    muted
                                    className="absolute bottom-4 right-4 w-28 h-36 rounded-xl border-2 border-white object-cover shadow-xl"
                                    ref={(video) => {
                                        if (video && call.localStream) {
                                            video.srcObject = call.localStream;
                                        }
                                    }}
                                />
                            </div>
                        )}

                        {/* AUDIO CALL */}
                        {call.type === "audio" && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <img
                                        src={call.activeUser?.profilePic || assets.avatar_icon}
                                        className="w-32 h-32 rounded-full object-cover border-4 border-violet-500"
                                    />
                                    {call.status === "connected" && (
                                        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-black"></span>
                                    )}
                                </div>
                                {call.status === "connected" && (
                                    <div className="flex gap-1 items-end h-8">
                                        {[...Array(5)].map((_, i) => (
                                            <div
                                                key={i}
                                                className="w-1 bg-violet-400 rounded-full animate-bounce"
                                                style={{
                                                    height: `${Math.random() * 20 + 8}px`,
                                                    animationDelay: `${i * 0.15}s`
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Connecting state */}
                        {call.status !== "connected" && (
                            <div className="text-white text-lg animate-pulse absolute">
                                {call.status === "calling" ? "Calling..." : "Connecting..."}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-8 mb-10">
                        <button onClick={toggleMute} className={`p-5 rounded-full ${call.muted ? "bg-red-600" : "bg-gray-700"}`}>
                            {call.muted ? <MicOff size={24} color="white" /> : <Mic size={24} color="white" />}
                        </button>
                        <button onClick={endCall} className="bg-red-600 p-5 rounded-full">
                            <PhoneOff size={24} color="white" />
                        </button>
                        {call.type === "video" && (
                            <button onClick={toggleVideo} className={`p-5 rounded-full ${call.videoEnabled ? "bg-gray-700" : "bg-red-600"}`}>
                                {call.videoEnabled ? <Video size={24} color="white" /> : <VideoOff size={24} color="white" />}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ── Messages ── */}
            <div className='flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6'>
                {messages.map((msg) => {
                    const isMe = msg.senderId === authUser._id
                    const isCallMessage = isCallMsg(msg)
                    const groupReaction = {}
                    msg.reactions?.forEach(r => {
                        groupReaction[r.emoji] = (groupReaction[r.emoji] || 0) + 1
                    })

                    // ── Call message ──
                    if (isCallMessage) {
                        return (
                            <div
                                key={msg._id}
                                className="w-full flex flex-col items-center my-3"
                            >
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5">
                                    <span className="text-gray-400 text-xs">
                                        {msg.text.includes("audio") ? "📞" : "📹"} {msg.text.replace("__CALL__", "").trim()}
                                    </span>
                
                                </div>
                                <span className="text-gray-600 text-[10px] mt-1">
                                    {msg.createdAt ? formatMessageTime(msg.createdAt) : ""}
                                </span>
                            </div>
                        )
                    }

                    // ── Regular message ──
                    return (
                        <div
                            key={msg._id}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                setMenuMsgId(msg._id)
                            }}
                            className={`relative flex items-end gap-2 mb-5 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                            {/* Avatar - left side for received messages */}
                            {!isMe && (
                                <img
                                    src={selectedUser?.profilePic || assets.avatar_icon}
                                    alt=""
                                    className='w-7 h-7 rounded-full object-cover self-end'
                                />
                            )}

                            {/* Bubble content */}
                            <div className={`relative max-w-[240px] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>

                                {msg.image ? (
                                    <img
                                        src={msg.image}
                                        alt=""
                                        className='max-w-[230px] border border-gray-700 rounded-2xl overflow-hidden'
                                    />
                                ) : msg.audio ? (
                                    <div className={`p-2 rounded-2xl ${isMe ? "bg-violet-600/40 rounded-br-sm" : "bg-gray-700/50 rounded-bl-sm"}`}>
                                        <audio controls className="w-[210px] h-8">
                                            <source src={msg.audio} type="audio/webm" />
                                        </audio>
                                    </div>
                                ) : (
                                    <div className={`px-3 py-2 rounded-2xl ${isMe
                                        ? 'bg-violet-600/50 rounded-br-sm text-white'
                                        : 'bg-gray-700/60 rounded-bl-sm text-gray-100'
                                    }`}>
                                        {msg.isDeleted ? (
                                            <span className="italic text-gray-400 text-sm">This message was deleted</span>
                                        ) : editingMsgId === msg._id ? (
                                            <input
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                onKeyDown={async (e) => {
                                                    if (e.key === "Enter") {
                                                        await axios.put(`/api/messages/edit/${msg._id}`, { content: editText })
                                                        setEditingMsgId(null)
                                                    }
                                                    if (e.key === "Escape") setEditingMsgId(null)
                                                }}
                                                className="bg-transparent border-b border-gray-400 outline-none text-white text-sm w-full"
                                                autoFocus
                                            />
                                        ) : (
                                            <>
                                                <span className="text-sm break-words">{msg.text}</span>
                                                {msg.editedAt && (
                                                    <span className="text-[10px] text-gray-400 ml-1">edited</span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Reactions */}
                                {Object.keys(groupReaction).length > 0 && (
                                    <div className={`flex gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        {Object.entries(groupReaction).map(([emoji, count]) => (
                                            <span key={emoji} className="text-sm bg-white/10 rounded-full px-1.5 py-0.5">
                                                {emoji}{count > 1 && <span className="text-[10px] text-gray-300 ml-0.5">{count}</span>}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* ── FIX: Time + tick on same row, below bubble ── */}
                                <div className={`flex items-center gap-1 mt-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <span className='text-[10px] text-gray-500'>
                                        {msg.createdAt ? formatMessageTime(msg.createdAt) : "sending..."}
                                    </span>
                                    {/* ── FIX: Blue tick - only show for sender, correctly ── */}
                                    {isMe && !msg.isDeleted && (
                                        <span className="text-[11px] leading-none">
                                            {msg.status === "seen"
                                                ? <span className="text-blue-400">✓✓</span>
                                                : msg.status === "delivered"
                                                    ? <span className="text-gray-400">✓✓</span>
                                                    : <span className="text-gray-400">✓</span>
                                            }
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Avatar - right side for sent messages */}
                            {isMe && (
                                <img
                                    src={authUser?.profilePic || assets.avatar_icon}
                                    alt=""
                                    className='w-7 h-7 rounded-full object-cover self-end'
                                />
                            )}
                        </div>
                    )
                })}
                <div ref={scrollEnd}></div>
            </div>

            {/* ── Context menu (right-click) ── */}
            {menuMsgId && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
                    onClick={() => setMenuMsgId(null)}
                >
                    <div
                        className="bg-gray-900 text-white rounded-xl shadow-xl p-4 w-64"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Reactions */}
                        <div className="flex justify-between text-2xl mb-3">
                            {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                <span
                                    key={emoji}
                                    className="cursor-pointer hover:scale-125 transition"
                                    onClick={() => handleSendReaction(menuMsgId, emoji)}
                                >
                                    {emoji}
                                </span>
                            ))}
                        </div>
                        <hr className="border-gray-700 my-2" />

                        {/* Copy - available to all */}
                        <p
                            className="cursor-pointer hover:text-violet-400 py-1"
                            onClick={async () => {
                                const msg = messages.find(m => m._id === menuMsgId)
                                if (msg?.isDeleted) {
                                    toast.error("Cannot copy a deleted message")
                                } else if (msg?.audio) {
                                    toast.error("Cannot copy audio messages")
                                } else if (msg?.image) {
                                    toast.error("Cannot copy image messages")
                                } else if (msg?.text && !msg.text.startsWith("__CALL__")) {
                                    try {
                                        await navigator.clipboard.writeText(msg.text)
                                        toast.success("Copied!")
                                    } catch {
                                        toast.error("Copy failed")
                                    }
                                } else {
                                    toast.error("Nothing to copy")
                                }
                                setMenuMsgId(null)
                            }}
                        >
                            Copy
                        </p>

                        {/* FIX: Edit & Delete only for message sender */}
                        {selectedMsgIsMe && (
                            <>
                                {/* Don't show Edit for call messages or deleted messages */}
                                {!isCallMsg(selectedMsg) && !selectedMsg?.isDeleted && (
                                    <p
                                        className="cursor-pointer hover:text-violet-400 py-1"
                                        onClick={() => {
                                            setEditingMsgId(menuMsgId)
                                            setEditText(selectedMsg?.text || "")
                                            setMenuMsgId(null)
                                        }}
                                    >
                                        Edit
                                    </p>
                                )}
                                <p
                                    className="cursor-pointer hover:text-red-400 py-1"
                                    onClick={async () => {
                                        await axios.delete(`/api/messages/delete/${menuMsgId}`)
                                        setMenuMsgId(null)
                                    }}
                                >
                                    Delete
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── Footer ── */}
            <div className='absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3'>
                <div className='flex-1 flex items-center bg-gray-100/12 px-3 rounded-full overflow-visible'>

                    {isTyping && (
                        <div className="flex gap-1 items-center px-4 py-2">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            <p className="text-xs text-gray-400 ml-2">Typing...</p>
                        </div>
                    )}

                    <input
                        onChange={(e) => {
                            setInput(e.target.value)
                            if (!typing) {
                                setTyping(true)
                                socket.emit("typing", selectedUser._id)
                                setTimeout(() => {
                                    socket.emit("stop typing", selectedUser._id)
                                    setTyping(false)
                                }, 3000)
                            }
                        }}
                        value={input}
                        onKeyDown={(e) => e.key === "Enter" ? handleSendMessage(e) : null}
                        type="text"
                        placeholder="Send a message"
                        className='flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400'
                    />

                    {aiLoading && (
                        <span className="text-xs text-gray-400 ml-2 animate-pulse">AI generating...</span>
                    )}

                    <div className='relative flex-shrink-0'>
                        <img
                            src={assets.Voice_recoder}
                            className={`w-6 sm:w-5 mr-2 cursor-pointer transition ${recording ? "filter brightness-150 hue-rotate-[-50deg]" : "opacity-70 hover:opacity-100"}`}
                            onClick={() => recording ? stopRecording() : startRecording()}
                        />
                        {recording && (
                            <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs text-red-500 flex items-center gap-1 whitespace-nowrap">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                REC
                            </span>
                        )}
                    </div>

                    <div className='relative flex-shrink-0'>
                        <img src={assets.AI_logo} onClick={() => setShowMenu(!showMenu)} className='w-6 sm:w-5 mr-2 cursor-pointer opacity-70 hover:opacity-100 transition' />
                    </div>

                    {showDecline && (
                        <button
                            onClick={() => { setInput(oldInput); setShowDecline(false); }}
                            className="absolute bottom-16 right-20 text-xs bg-red-500 px-2 py-1 rounded"
                        >
                            Decline
                        </button>
                    )}

                    {showMenu && (
                        <div className="absolute bottom-14 right-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-lg text-sm text-white p-3 w-48 z-50">
                            <p onClick={handleAiRephrase} className="cursor-pointer hover:text-violet-400">✨ Fix Grammar</p>
                            <p onClick={summarizingHandler} className="cursor-pointer hover:text-violet-400 mt-2">🪄 Summarize</p>
                            <p onClick={() => handleToneChange("formal")} className="cursor-pointer hover:text-violet-400 mt-2">🎭 Make Formal</p>
                            <p onClick={() => handleToneChange("friendly")} className="cursor-pointer hover:text-violet-400 mt-2">😊 Make Friendly</p>
                            <p onClick={handleSoftenText} className="cursor-pointer hover:text-violet-400 mt-2">🤝 Soften Tone</p>
                            <p onClick={handleSmartReply} className="cursor-pointer hover:text-violet-400 mt-2">💬 Smart Reply</p>
                        </div>
                    )}

                    <label htmlFor="image" className='relative flex-shrink-0 cursor-pointer'>
                        <input onChange={handleSendImage} type="file" id="image" accept="image/png, image/jpeg" hidden />
                        <img src={assets.gallery_icon} alt="" className="w-6 sm:w-5 mr-2 opacity-70 hover:opacity-100 transition" />
                    </label>
                </div>

                <img onClick={handleSendMessage} src={assets.send_button} alt="" className="w-9 sm:w-7 cursor-pointer flex-shrink-0" />
            </div>
        </div>
    ) : (
        <div className='flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden'>
            <img src={assets.logo_icon} alt="" className='max-w-16' />
            <p className='text-lg font-medium text-white'>Chat anytime, anywhere</p>
        </div>
    )
}

export default Chatcontainer
