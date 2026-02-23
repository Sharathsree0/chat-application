import { useState, useRef, useEffect } from "react";
import axios from "axios";

export const useCall = (socket, selectedUser) => {

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingCandidates = useRef([]);

  const [call, setCall] = useState({
    status: "idle",
    type: null,
    incoming: null,
    activeUser: null,
    localStream: null,
    remoteStream: null,
    muted: false,
    videoEnabled: true
  });

//     CREATE PEER CONNECTION

  const createPeer = (receiverId) => {

    console.log("🟢 Creating peer for:", receiverId);

    const pc = new RTCPeerConnection({
  iceServers: [
  { urls: "stun:stun.l.google.com:19302" },

  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject"
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject"
  }
]
});
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("iceCandidate", {
          receiverId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
  console.log("REMOTE TRACK RECEIVED", event.streams);
      setCall(prev => ({
        ...prev,
        remoteStream: event.streams[0]
      }));
    };

   pc.oniceconnectionstatechange = () => {
  console.log("🧊 ICE state:", pc.iceConnectionState);
};

pc.onconnectionstatechange = () => {
  console.log("🔗 Peer state:", pc.connectionState);
};

    peerRef.current = pc;
    return pc;
  };

//     START CALL (CALLER)

  const startCall = async (type) => {

    if (!selectedUser || !socket) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video"
    });

    localStreamRef.current = stream;

    setCall(prev => ({
      ...prev,
      status: "calling",
      type,
      activeUser: selectedUser,
      localStream: stream
    }));

    const pc = createPeer(selectedUser._id);

    stream.getTracks().forEach(track =>
      pc.addTrack(track, stream)
    );

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    console.log("📤 Offer sent");

    socket.emit("callUser", {
      receiverId: selectedUser._id,
      offer,
      callType: type
    });
  };

//     ACCEPT CALL (RECEIVER)

  const acceptCall = async () => {

    if (!call.incoming) return;

    const { callerId, offer, callType, callerName, profilePic } =
      call.incoming;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video"
    });

    localStreamRef.current = stream;

    const pc = createPeer(callerId);

    stream.getTracks().forEach(track =>
      pc.addTrack(track, stream)
    );

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log("📥 Remote description set (offer)");

    // flush queued ICE candidates
    pendingCandidates.current.forEach(async (candidate) => {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("ICE flush error:", err);
      }
    });
    pendingCandidates.current = [];

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit("answerCall", { callerId, answer });

    setCall(prev => ({
  ...prev,
  status: "connecting",
  incoming: null,
  activeUser: {
    _id: callerId,
    fullName: callerName,
    profilePic
  },
  localStream: stream
}));
  };

//     END CALL

  const cleanup = () => {

    console.log("🧹 Cleaning up call");

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    peerRef.current?.close();

    peerRef.current = null;
    localStreamRef.current = null;
    pendingCandidates.current = [];

    setCall({
      status: "idle",
      type: null,
      incoming: null,
      activeUser: null,
      localStream: null,
      remoteStream: null,
      muted: false,
      videoEnabled: true
    });
  };

  const endCall = async () => {
    const receiverId =
      call.incoming?.callerId || call.activeUser?._id || selectedUser?._id;

    if (receiverId) {
      socket.emit("endCall", { receiverId });

      const label =
        call.type === "video" ? "Video call" : "Audio call";

      await axios.post(`/api/messages/send/${receiverId}`, {
        text: `__CALL__${label}`
      });
    }

    cleanup();
  };

//   TOGGLES

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;

    setCall(prev => ({
      ...prev,
      muted: !track.enabled
    }));
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;

    setCall(prev => ({
      ...prev,
      videoEnabled: track.enabled
    }));
  };

//     SOCKET LISTENERS

  useEffect(() => {

    if (!socket) return;

    const handleIncoming = (data) => {
      console.log("📞 Incoming call");
      setCall(prev => ({
        ...prev,
        status: "ringing",
        incoming: data
      }));
    };

    const handleAnswered = async ({ answer }) => {

      if (!peerRef.current) return;

      await peerRef.current.setRemoteDescription(
        new RTCSessionDescription(answer)
      );

      console.log("📥 Remote description set (answer)");

      // flush queued ICE
      pendingCandidates.current.forEach(async (candidate) => {
        try {
          await peerRef.current.addIceCandidate(candidate);
        } catch (err) {
          console.error("ICE flush error:", err);
        }
      });
      pendingCandidates.current = [];

      setCall(prev => ({
        ...prev,
        status: "connected"
      }));
    };

    const handleIce = async ({ candidate }) => {
if (!peerRef.current) {
  console.log("⏳ ICE received before peer, queuing");
  pendingCandidates.current.push(new RTCIceCandidate(candidate));
  return;
}

      const ice = new RTCIceCandidate(candidate);

      if (peerRef.current.remoteDescription) {
        try {
          await peerRef.current.addIceCandidate(ice);
        } catch (err) {
          console.error("ICE error:", err);
        }
      } else {
        console.log("⏳ ICE queued");
        pendingCandidates.current.push(ice);
      }
    };

    const handleEnded = () => {
      cleanup();
    };

    socket.on("incomingCall", handleIncoming);
    socket.on("callAnswered", handleAnswered);
    socket.on("iceCandidate", handleIce);
    socket.on("callEnded", handleEnded);

    return () => {
      socket.off("incomingCall", handleIncoming);
      socket.off("callAnswered", handleAnswered);
      socket.off("iceCandidate", handleIce);
      socket.off("callEnded", handleEnded);
    };

  }, [socket]);

  return {
    call,
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleVideo
  };
};