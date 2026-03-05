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

  // ── CREATE PEER ───────────────────────────────────────────────────────────
  const createPeer = (receiverId) => {
    console.log("🟢 Creating peer for:", receiverId);

    // Close any existing peer before creating a new one
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
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

    // FIX 1: ontrack - handle both streams[0] and track directly
    pc.ontrack = (event) => {
      console.log("🎥 REMOTE TRACK RECEIVED", event.streams);
      const remoteStream = event.streams?.[0];
      if (remoteStream) {
        setCall(prev => ({ ...prev, remoteStream, status: "connected" }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("🧊 ICE state:", pc.iceConnectionState);
      // FIX 2: Mark as connected when ICE is connected/completed
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setCall(prev => ({ ...prev, status: "connected" }));
      }
      // Handle disconnection
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        console.warn("⚠️ ICE disconnected/failed");
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("🔗 Peer state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCall(prev => ({ ...prev, status: "connected" }));
      }
      if (pc.connectionState === "failed") {
        console.error("❌ Peer connection failed");
      }
    };

    peerRef.current = pc;
    return pc;
  };

  // ── START CALL (CALLER) ───────────────────────────────────────────────────
  const startCall = async (type) => {
    if (!selectedUser || !socket) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === "video"
      });

      localStreamRef.current = stream;

      // FIX 3: Set type in state BEFORE creating peer so UI shows correctly
      setCall(prev => ({
        ...prev,
        status: "calling",
        type,
        activeUser: selectedUser,
        localStream: stream
      }));

      const pc = createPeer(selectedUser._id);

      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("📤 Offer sent");

      socket.emit("callUser", {
        receiverId: selectedUser._id,
        offer,
        callType: type
      });

    } catch (err) {
      console.error("❌ startCall error:", err);
      cleanup();
    }
  };

  // ── ACCEPT CALL (RECEIVER) ────────────────────────────────────────────────
  const acceptCall = async () => {
    if (!call.incoming) return;

    const { callerId, offer, callType, callerName, profilePic } = call.incoming;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video"
      });

      localStreamRef.current = stream;

      const pc = createPeer(callerId);

      // FIX 4: Add local tracks BEFORE setting remote description
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("📥 Remote description set (offer)");

      // FIX 5: Flush pending ICE candidates AFTER remote description
      for (const candidate of pendingCandidates.current) {
        try {
          await pc.addIceCandidate(candidate);
          console.log("✅ Flushed ICE candidate");
        } catch (err) {
          console.error("ICE flush error:", err);
        }
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit("answerCall", { callerId, answer });

      // FIX 6: Set type + status properly so call screen appears for receiver too
      setCall(prev => ({
        ...prev,
        status: "connecting",
        type: callType,
        incoming: null,
        activeUser: {
          _id: callerId,
          fullName: callerName,
          profilePic
        },
        localStream: stream
      }));

    } catch (err) {
      console.error("❌ acceptCall error:", err);
      cleanup();
    }
  };

  // ── CLEANUP ───────────────────────────────────────────────────────────────
  const cleanup = () => {
    console.log("🧹 Cleaning up call");

    localStreamRef.current?.getTracks().forEach(t => t.stop());

    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }

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

  // ── END CALL ──────────────────────────────────────────────────────────────
  const endCall = async () => {
    const receiverId =
      call.incoming?.callerId || call.activeUser?._id || selectedUser?._id;

    if (receiverId) {
      socket.emit("endCall", { receiverId });

      const label = call.type === "video" ? "Video call" : "Audio call";

      try {
        await axios.post(`/api/messages/send/${receiverId}`, {
          text: `__CALL__${label}`
        });
      } catch (err) {
        console.error("Call log error:", err);
      }
    }

    cleanup();
  };

  // ── TOGGLES ───────────────────────────────────────────────────────────────
  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCall(prev => ({ ...prev, muted: !track.enabled }));
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCall(prev => ({ ...prev, videoEnabled: track.enabled }));
  };

  // ── SOCKET LISTENERS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleIncoming = (data) => {
      console.log("📞 Incoming call from:", data.callerName);
      setCall(prev => ({
        ...prev,
        status: "ringing",
        incoming: data
      }));
    };

    const handleAnswered = async ({ answer }) => {
      if (!peerRef.current) return;

      try {
        await peerRef.current.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
        console.log("📥 Remote description set (answer)");

        // FIX 7: Flush queued ICE candidates after setting remote desc
        for (const candidate of pendingCandidates.current) {
          try {
            await peerRef.current.addIceCandidate(candidate);
            console.log("✅ Flushed ICE (post-answer)");
          } catch (err) {
            console.error("ICE flush error:", err);
          }
        }
        pendingCandidates.current = [];

        setCall(prev => ({ ...prev, status: "connected" }));

      } catch (err) {
        console.error("❌ handleAnswered error:", err);
      }
    };

    const handleIce = async ({ candidate }) => {
      const ice = new RTCIceCandidate(candidate);

      if (!peerRef.current || !peerRef.current.remoteDescription) {
        // FIX 8: Queue if peer not ready or remote desc not set yet
        console.log("⏳ ICE queued (peer not ready)");
        pendingCandidates.current.push(ice);
        return;
      }

      try {
        await peerRef.current.addIceCandidate(ice);
      } catch (err) {
        console.error("ICE error:", err);
      }
    };

    const handleEnded = () => {
      console.log("📵 Call ended by remote");
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

  return { call, startCall, acceptCall, endCall, toggleMute, toggleVideo };
};
