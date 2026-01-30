import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useSelector } from "react-redux";
import { useSocketContext } from "../socket/SocketContext";
import CallService from "../socket/callService";
import createPeerConnection from "../webRTCUtils/createPeerConnection";
import {
  playOutgoingRing,
  playIncomingRing,
  stopRingtone,
} from "../utils/callRingtone";

// ── Call States ──
export const CALL_STATES = {
  IDLE: "idle",
  RINGING: "ringing",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  ENDED: "ended",
};

const VideoCallContext = createContext(null);
const VideoCallActionsContext = createContext(null);

export function VideoCallProvider({ children }) {
  const { socket, isAuthenticated } = useSocketContext();
  const userId = useSelector((state) => state.auth.userId);
  const isExpert = useSelector((state) => state.auth.userInfo?.isExpert);
  const isAdmin = useSelector((state) => state.auth.userInfo?.isAdmin);

  // ── State ──
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [callId, setCallId] = useState(null);
  const [remoteUserId, setRemoteUserId] = useState(null);
  const [isCaller, setIsCaller] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [duration, setDuration] = useState(0);
  const [callerInfo, setCallerInfo] = useState(null);
  const [remoteUserInfo, setRemoteUserInfo] = useState(null); // { name, avatar }
  const [endReason, setEndReason] = useState(null);
  const [callError, setCallError] = useState(null);
  // Expert permission state
  const [permissionState, setPermissionState] = useState("idle"); // idle | requesting | granted | denied | incoming_request
  const [permissionTarget, setPermissionTarget] = useState(null); // { userId, name, avatar }
  const [permissionExpert, setPermissionExpert] = useState(null); // { expertId, name, avatar, qualification }
  const [permissionWindowExpiry, setPermissionWindowExpiry] = useState(null);
  const [permissionCooldownEnd, setPermissionCooldownEnd] = useState(null); // timestamp when cooldown expires
  const [permissionDenyReason, setPermissionDenyReason] = useState(null); // "user_offline" | null
  // Time warning from server
  const [timeWarning, setTimeWarning] = useState(null); // { remaining: number } | null
  // Video swap (PiP ↔ fullscreen)
  const [isVideoSwapped, setIsVideoSwapped] = useState(false);

  // ── Refs (for use inside callbacks without re-registration) ──
  const callServiceRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const iceCandidateQueueRef = useRef([]);
  const durationIntervalRef = useRef(null);
  const callIdRef = useRef(null);
  const callStateRef = useRef(CALL_STATES.IDLE);
  const permissionTimeoutRef = useRef(null);
  const localStreamRef = useRef(null); // Ref to avoid cleanup dependency on localStream state

  // Keep refs in sync with state
  useEffect(() => { callIdRef.current = callId; }, [callId]);
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // ── Ringtone management ──
  useEffect(() => {
    if (callState === CALL_STATES.RINGING) {
      if (isCaller) {
        playOutgoingRing();
      } else {
        playIncomingRing();
      }
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [callState, isCaller]);

  // ── Helper: cleanup everything (NO dependencies — uses refs) ──
  const cleanup = useCallback(() => {
    console.log("[useVideoCall] Cleanup");
    stopRingtone();

    // Stop local media tracks via ref
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Reset ICE queue
    iceCandidateQueueRef.current = [];

    // Reset all state
    setLocalStream(null);
    setRemoteStream(null);
    setCallId(null);
    setRemoteUserId(null);
    setIsCaller(false);
    setIsVideoEnabled(true);
    setIsAudioEnabled(true);
    setRemoteVideoEnabled(true);
    setRemoteAudioEnabled(true);
    setDuration(0);
    setCallerInfo(null);
    setRemoteUserInfo(null);
    setEndReason(null);
    setCallState(CALL_STATES.IDLE);
    setIsVideoSwapped(false);
    setTimeWarning(null);
    // Reset permission state
    setPermissionState("idle");
    setPermissionTarget(null);
    setPermissionExpert(null);
    setPermissionWindowExpiry(null);
  }, []); // ← No dependencies! Uses refs for mutable data.

  // ── Helper: get user media ──
  const acquireMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    setLocalStream(stream);
    localStreamRef.current = stream;
    return stream;
  }, []);

  // ── Helper: start duration timer ──
  const startDurationTimer = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    setDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);
  }, []);

  // ── Helper: setup peer connection & add local tracks ──
  const setupPeerConnection = useCallback(
    async (stream) => {
      const { peerConnection, remoteStream: rStream } =
        await createPeerConnection(
          // ICE candidate callback
          (candidate) => {
            const svc = callServiceRef.current;
            const cid = callIdRef.current;
            if (svc && cid) {
              svc.sendIceCandidate(cid, candidate);
            }
          },
          // Connection state change callback
          (state) => {
            console.log("[useVideoCall] PC connection state:", state);
            if (state === "connected") {
              setCallState(CALL_STATES.CONNECTED);
              startDurationTimer();
            } else if (state === "failed" || state === "closed") {
              if (
                callStateRef.current === CALL_STATES.CONNECTED ||
                callStateRef.current === CALL_STATES.CONNECTING
              ) {
                const svc = callServiceRef.current;
                const cid = callIdRef.current;
                if (svc && cid) {
                  svc.endCall(cid, "connection_lost").catch(() => {});
                }
                setEndReason("connection_lost");
                setCallState(CALL_STATES.ENDED);
              }
            }
          }
        );

      // Add local tracks to the connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      peerConnectionRef.current = peerConnection;
      setRemoteStream(rStream);
      return peerConnection;
    },
    [startDurationTimer]
  );

  // ── Helper: flush queued ICE candidates ──
  const flushIceCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    const queue = [...iceCandidateQueueRef.current];
    iceCandidateQueueRef.current = [];

    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("[useVideoCall] Failed to add queued ICE candidate:", err);
      }
    }
  }, []);

  // ──────────────────────────────────────────────────────────────
  //  Socket listener callbacks
  //  These are stored in a ref so socket listeners don't need
  //  to be re-registered when callbacks change.
  // ──────────────────────────────────────────────────────────────

  const callbacksRef = useRef({});

  // Define all callback implementations
  const onIncomingCall = useCallback((payload) => {
    const data = payload.data || payload;
    console.log("[useVideoCall] Incoming call:", data);
    if (callStateRef.current !== CALL_STATES.IDLE) return;

    setCallId(data.callId);
    setRemoteUserId(data.callerId);
    setIsCaller(false);
    setCallerInfo({
      callerId: data.callerId,
      callerName: data.callerName,
      callerAvatar: data.callerAvatar,
    });
    // Set remote user info for the VideoCall UI
    setRemoteUserInfo({
      name: data.callerName || "Unknown",
      avatar: data.callerAvatar || null,
    });
    setCallState(CALL_STATES.RINGING);
  }, []);

  const onCallAccepted = useCallback(async (payload) => {
    const data = payload.data || payload;
    console.log("[useVideoCall] Call accepted, creating offer");
    setCallState(CALL_STATES.CONNECTING);

    try {
      const stream = await acquireMedia();
      const pc = await setupPeerConnection(stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      callServiceRef.current?.sendOffer(data.callId, offer);
    } catch (err) {
      console.error("[useVideoCall] Error after call accepted:", err);
      const svc = callServiceRef.current;
      const cid = callIdRef.current;
      if (svc && cid) {
        svc.endCall(cid, "media_error").catch(() => {});
      }
      setEndReason("media_error");
      setCallState(CALL_STATES.ENDED);
      setTimeout(() => cleanup(), 3000);
    }
  }, [acquireMedia, setupPeerConnection, cleanup]);

  const onOffer = useCallback(async (payload) => {
    const data = payload.data || payload;
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.error("[useVideoCall] No peer connection for offer");
      return;
    }

    // Guard: only accept offer when PC is in a valid state
    if (pc.signalingState !== "stable") {
      console.warn("[useVideoCall] Ignoring offer in state:", pc.signalingState);
      return;
    }

    console.log("[useVideoCall] Received SDP offer, signalingState:", pc.signalingState);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      await flushIceCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      callServiceRef.current?.sendAnswer(data.callId, answer);
    } catch (err) {
      console.error("[useVideoCall] Error handling offer:", err);
      const svc = callServiceRef.current;
      const cid = callIdRef.current;
      if (svc && cid) {
        svc.endCall(cid, "webrtc_error").catch(() => {});
      }
      setEndReason("connection_lost");
      setCallState(CALL_STATES.ENDED);
      setTimeout(() => cleanup(), 3000);
    }
  }, [flushIceCandidates, cleanup]);

  const onAnswer = useCallback(async (payload) => {
    const data = payload.data || payload;
    const pc = peerConnectionRef.current;
    if (!pc) return;

    // Guard: only accept answer when we have a local offer pending
    if (pc.signalingState !== "have-local-offer") {
      console.warn("[useVideoCall] Ignoring answer in state:", pc.signalingState);
      return;
    }

    console.log("[useVideoCall] Received SDP answer, signalingState:", pc.signalingState);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      await flushIceCandidates();
    } catch (err) {
      console.error("[useVideoCall] Error handling answer:", err);
    }
  }, [flushIceCandidates]);

  const onIceCandidate = useCallback(async (payload) => {
    const data = payload.data || payload;
    const pc = peerConnectionRef.current;
    if (!pc) return;
    if (pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn("[useVideoCall] Error adding ICE candidate:", err);
      }
    } else {
      iceCandidateQueueRef.current.push(data.candidate);
    }
  }, []);

  const onCallRejected = useCallback((payload) => {
    const data = payload.data || payload;
    console.log("[useVideoCall] Call rejected:", data.reason);
    setEndReason(data.reason || "rejected");
    setCallState(CALL_STATES.ENDED);
    setTimeout(() => cleanup(), 2000);
  }, [cleanup]);

  const onCallEnded = useCallback((payload) => {
    const data = payload.data || payload;
    console.log("[useVideoCall] Call ended:", data.reason);
    setEndReason(data.reason || "ended");
    setCallState(CALL_STATES.ENDED);
    setTimeout(() => cleanup(), 2000);
  }, [cleanup]);

  const onCallMissed = useCallback(() => {
    console.log("[useVideoCall] Call missed");
    setEndReason("missed");
    setCallState(CALL_STATES.ENDED);
    setTimeout(() => cleanup(), 2000);
  }, [cleanup]);

  const onMissedIncoming = useCallback(() => {
    console.log("[useVideoCall] Missed incoming call notification");
    if (callStateRef.current === CALL_STATES.RINGING) {
      setEndReason("missed");
      setCallState(CALL_STATES.ENDED);
      setTimeout(() => cleanup(), 2000);
    }
  }, [cleanup]);

  const onCallBusy = useCallback(() => {
    console.log("[useVideoCall] User is busy");
    setEndReason("busy");
    setCallState(CALL_STATES.ENDED);
    setTimeout(() => cleanup(), 2000);
  }, [cleanup]);

  const onMediaState = useCallback((payload) => {
    const data = payload.data || payload;
    if (data.video !== undefined) setRemoteVideoEnabled(data.video);
    if (data.audio !== undefined) setRemoteAudioEnabled(data.audio);
  }, []);

  // ── Expert permission callbacks ──
  const onPermissionRequest = useCallback((payload) => {
    const data = payload.data || payload;
    console.log("[useVideoCall] Permission request from expert:", data.expertId);
    setPermissionExpert({
      expertId: data.expertId,
      name: data.expertName || "Expert",
      avatar: data.expertAvatar || null,
      qualification: data.expertQualification || null,
    });
    setPermissionState("incoming_request");
  }, []);

  const onPermissionGranted = useCallback((payload) => {
    const data = payload.data || payload;
    console.log("[useVideoCall] Permission granted to call:", data.userId);
    // Clear timeout since we got a real response
    if (permissionTimeoutRef.current) {
      clearTimeout(permissionTimeoutRef.current);
      permissionTimeoutRef.current = null;
    }
    setPermissionTarget({
      userId: data.userId,
      name: data.userName || "User",
      avatar: data.userAvatar || null,
    });
    setPermissionState("granted");
    setPermissionWindowExpiry(Date.now() + (data.windowSeconds || 300) * 1000);
  }, []);

  const onPermissionDenied = useCallback((payload) => {
    const data = payload.data || payload;
    console.log("[useVideoCall] Permission denied:", data);
    // Clear timeout since we got a real response
    if (permissionTimeoutRef.current) {
      clearTimeout(permissionTimeoutRef.current);
      permissionTimeoutRef.current = null;
    }
    setPermissionState("denied");
    setPermissionDenyReason(data.reason || null); // "user_offline" or null (normal decline)
    const cooldownSec = data.cooldownSeconds ?? 60;
    if (cooldownSec > 0) {
      setPermissionCooldownEnd(Date.now() + cooldownSec * 1000);
    } else {
      setPermissionCooldownEnd(null);
    }
    // Keep denied state visible — for cooldown duration, or 5s if no cooldown (user went offline)
    const visibleMs = cooldownSec > 0 ? cooldownSec * 1000 : 5000;
    setTimeout(() => {
      setPermissionState("idle");
      setPermissionTarget(null);
      setPermissionCooldownEnd(null);
      setPermissionDenyReason(null);
    }, visibleMs);
  }, []);

  const onTimeWarning = useCallback((payload) => {
    const data = payload.data || payload;
    console.log("[useVideoCall] Time warning:", data.remaining, "seconds remaining");
    setTimeWarning({ remaining: data.remaining });
    // Auto-clear warning after 8 seconds
    setTimeout(() => setTimeWarning(null), 8000);
  }, []);

  // Keep callbacksRef always pointing to latest callbacks
  useEffect(() => {
    callbacksRef.current = {
      onIncomingCall,
      onCallAccepted,
      onCallRejected,
      onCallEnded,
      onCallMissed,
      onMissedIncoming,
      onCallBusy,
      onOffer,
      onAnswer,
      onIceCandidate,
      onMediaState,
      onPermissionRequest,
      onPermissionGranted,
      onPermissionDenied,
      onTimeWarning,
    };
  });

  // ── Initialize CallService and listeners ONCE ──
  // Uses stable wrapper functions that delegate to callbacksRef.
  // This prevents listener re-registration when callbacks change,
  // eliminating the gap where events could be missed.
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    const callService = new CallService(socket);
    callServiceRef.current = callService;

    const destroyListeners = callService.initializeCallListeners({
      onIncomingCall: (p) => callbacksRef.current.onIncomingCall?.(p),
      onCallAccepted: (p) => callbacksRef.current.onCallAccepted?.(p),
      onCallRejected: (p) => callbacksRef.current.onCallRejected?.(p),
      onCallEnded: (p) => callbacksRef.current.onCallEnded?.(p),
      onCallMissed: (p) => callbacksRef.current.onCallMissed?.(p),
      onMissedIncoming: (p) => callbacksRef.current.onMissedIncoming?.(p),
      onCallBusy: (p) => callbacksRef.current.onCallBusy?.(p),
      onOffer: (p) => callbacksRef.current.onOffer?.(p),
      onAnswer: (p) => callbacksRef.current.onAnswer?.(p),
      onIceCandidate: (p) => callbacksRef.current.onIceCandidate?.(p),
      onMediaState: (p) => callbacksRef.current.onMediaState?.(p),
      onPermissionRequest: (p) => callbacksRef.current.onPermissionRequest?.(p),
      onPermissionGranted: (p) => callbacksRef.current.onPermissionGranted?.(p),
      onPermissionDenied: (p) => callbacksRef.current.onPermissionDenied?.(p),
      onTimeWarning: (p) => callbacksRef.current.onTimeWarning?.(p),
    });

    return () => {
      destroyListeners();
      callService.destroy();
      callServiceRef.current = null;
    };
  }, [socket, isAuthenticated]); // ← Only re-runs on socket/auth change, never on callback change

  // ──────────────────────────────────────────────────────────────
  //  Public API
  // ──────────────────────────────────────────────────────────────

  /**
   * Initiate a video call.
   * @param {string} calleeId - The user ID to call
   * @param {{ name?: string, avatar?: string }} userInfo - Remote user's display info
   */
  const initiateCall = useCallback(
    async (calleeId, userInfo) => {
      if (callState !== CALL_STATES.IDLE) return;
      if (!callServiceRef.current) return;

      // Expert must have granted permission before calling (unless admin)
      if (isExpert && !isAdmin && permissionState !== "granted") {
        setCallError({
          errorCode: "PERMISSION_REQUIRED",
          message: "You must request and receive permission before calling a user.",
        });
        return;
      }

      // Clear permission UI once expert proceeds with the call
      if (permissionState === "granted") {
        setPermissionState("idle");
        setPermissionTarget(null);
        setPermissionWindowExpiry(null);
      }

      setRemoteUserId(calleeId);
      setIsCaller(true);
      // Store remote user info for the VideoCall UI
      setRemoteUserInfo({
        name: userInfo?.name || "User",
        avatar: userInfo?.avatar || null,
      });
      setCallState(CALL_STATES.RINGING);

      try {
        const response = await callServiceRef.current.initiateCall(calleeId);
        const data = response.data || response;

        if (data.status === "ok" && data.callId) {
          setCallId(data.callId);
        } else {
          console.error("[useVideoCall] Initiate failed:", data);
          setCallState(CALL_STATES.IDLE);
          setIsCaller(false);
          setRemoteUserId(null);
          setRemoteUserInfo(null);
          setCallError({
            errorCode: data.errorCode || "UNKNOWN",
            message: data.message || "Failed to start call",
          });
        }
      } catch (err) {
        console.error("[useVideoCall] Initiate error:", err);
        setCallState(CALL_STATES.IDLE);
        setIsCaller(false);
        setRemoteUserId(null);
        setRemoteUserInfo(null);
        setCallError({
          errorCode: "NETWORK_ERROR",
          message: "Network error. Please check your connection.",
        });
      }
    },
    [callState, isExpert, isAdmin, permissionState]
  );

  const acceptCall = useCallback(async () => {
    if (callState !== CALL_STATES.RINGING || isCaller) return;
    if (!callServiceRef.current || !callIdRef.current) return;

    setCallState(CALL_STATES.CONNECTING);

    try {
      const stream = await acquireMedia();
      await setupPeerConnection(stream);
      await callServiceRef.current.acceptCall(callIdRef.current);
    } catch (err) {
      console.error("[useVideoCall] Accept error (media/setup failed):", err);
      const svc = callServiceRef.current;
      const cid = callIdRef.current;
      if (svc && cid) {
        svc.rejectCall(cid, "media_error").catch(() => {});
      }
      setEndReason("media_error");
      setCallState(CALL_STATES.ENDED);
      setTimeout(() => cleanup(), 3000);
    }
  }, [callState, isCaller, acquireMedia, setupPeerConnection, cleanup]);

  const rejectCall = useCallback(async () => {
    if (callState !== CALL_STATES.RINGING || isCaller) return;
    if (!callServiceRef.current || !callIdRef.current) return;

    try {
      await callServiceRef.current.rejectCall(callIdRef.current, "declined");
    } catch (err) {
      console.error("[useVideoCall] Reject error:", err);
    }
    cleanup();
  }, [callState, isCaller, cleanup]);

  const endCall = useCallback(async () => {
    if (
      callState === CALL_STATES.IDLE ||
      callState === CALL_STATES.ENDED
    )
      return;

    const svc = callServiceRef.current;
    const cid = callIdRef.current;

    // If we have a callId, tell the server
    if (svc && cid) {
      try {
        await svc.endCall(cid, "hangup");
      } catch (err) {
        console.error("[useVideoCall] End call error:", err);
      }
    }
    // Always end locally even if no callId (e.g. during RINGING before server responded)
    setEndReason("hangup");
    setCallState(CALL_STATES.ENDED);
    setTimeout(() => cleanup(), 1000);
  }, [callState, cleanup]);

  const dismissCallError = useCallback(() => {
    setCallError(null);
  }, []);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    const newEnabled = !videoTrack.enabled;
    videoTrack.enabled = newEnabled;
    setIsVideoEnabled(newEnabled);

    const svc = callServiceRef.current;
    const cid = callIdRef.current;
    if (svc && cid) {
      svc.toggleVideo(cid, newEnabled);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    const newEnabled = !audioTrack.enabled;
    audioTrack.enabled = newEnabled;
    setIsAudioEnabled(newEnabled);

    const svc = callServiceRef.current;
    const cid = callIdRef.current;
    if (svc && cid) {
      svc.toggleAudio(cid, newEnabled);
    }
  }, []);

  /** Clear permission request timeout */
  const clearPermissionTimeout = useCallback(() => {
    if (permissionTimeoutRef.current) {
      clearTimeout(permissionTimeoutRef.current);
      permissionTimeoutRef.current = null;
    }
  }, []);

  /** Cancel a pending permission request (user-initiated) */
  const cancelPermissionRequest = useCallback(() => {
    clearPermissionTimeout();
    setPermissionState("idle");
    setPermissionTarget(null);
  }, [clearPermissionTimeout]);

  /** Expert requests permission to call a user */
  const requestCallPermission = useCallback(async (targetUserId, userInfo) => {
    if (!callServiceRef.current) return;
    if (permissionState === "requesting") return; // prevent double-tap

    setPermissionState("requesting");
    setPermissionDenyReason(null);
    setPermissionTarget({
      userId: targetUserId,
      name: userInfo?.name || "User",
      avatar: userInfo?.avatar || null,
    });

    try {
      const response = await callServiceRef.current.requestPermission(targetUserId);
      const data = response.data || response;
      if (data.status !== "ok") {
        console.error("[useVideoCall] Permission request failed:", data);
        clearPermissionTimeout();
        setPermissionState("denied");
        if (data.errorCode === "COOLDOWN" && data.cooldownRemaining) {
          setPermissionCooldownEnd(Date.now() + data.cooldownRemaining * 1000);
          setTimeout(() => {
            setPermissionState("idle");
            setPermissionTarget(null);
            setPermissionCooldownEnd(null);
          }, data.cooldownRemaining * 1000);
        } else {
          setTimeout(() => {
            setPermissionState("idle");
            setPermissionTarget(null);
          }, 3000);
        }
      } else {
        // Auto-timeout after 65s (user gets 60s to respond on their side)
        clearPermissionTimeout();
        permissionTimeoutRef.current = setTimeout(() => {
          console.log("[useVideoCall] Permission request timed out (65s)");
          setPermissionState("denied");
          setTimeout(() => {
            setPermissionState("idle");
            setPermissionTarget(null);
          }, 3000);
        }, 65000);
      }
    } catch (err) {
      console.error("[useVideoCall] Permission request error:", err);
      clearPermissionTimeout();
      setPermissionState("denied");
      setTimeout(() => {
        setPermissionState("idle");
        setPermissionTarget(null);
      }, 3000);
    }
  }, [permissionState, clearPermissionTimeout]);

  /** User responds to an expert's permission request */
  const respondToPermission = useCallback(async (expertId, accepted) => {
    if (!callServiceRef.current) return;

    try {
      await callServiceRef.current.respondToPermission(expertId, accepted);
    } catch (err) {
      console.error("[useVideoCall] Permission response error:", err);
    }
    // Reset permission UI
    setPermissionState("idle");
    setPermissionExpert(null);
  }, []);

  /** Toggle PiP ↔ fullscreen video swap */
  const toggleVideoSwap = useCallback(() => {
    setIsVideoSwapped((prev) => !prev);
  }, []);

  // ── Context values ──
  // Actions context — stable references, won't cause re-renders from duration ticks
  const actions = useMemo(() => ({
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio,
    cleanup,
    dismissCallError,
    requestCallPermission,
    respondToPermission,
    cancelPermissionRequest,
    toggleVideoSwap,
  }), [initiateCall, acceptCall, rejectCall, endCall, toggleVideo, toggleAudio, cleanup, dismissCallError, requestCallPermission, respondToPermission, cancelPermissionRequest, toggleVideoSwap]);

  // Full state + actions context (used by VideoCall/IncomingCall UI)
  const value = {
    // State
    callState,
    callId,
    remoteUserId,
    isCaller,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    remoteVideoEnabled,
    remoteAudioEnabled,
    duration,
    callerInfo,
    remoteUserInfo,
    endReason,
    callError,
    // Expert permission state
    permissionState,
    permissionTarget,
    permissionExpert,
    permissionWindowExpiry,
    permissionCooldownEnd,
    permissionDenyReason,
    // Time warning
    timeWarning,
    // Video swap
    isVideoSwapped,
    // Actions
    ...actions,
  };

  return (
    <VideoCallContext.Provider value={value}>
      <VideoCallActionsContext.Provider value={actions}>
        {children}
      </VideoCallActionsContext.Provider>
    </VideoCallContext.Provider>
  );
}

export function useVideoCall() {
  const context = useContext(VideoCallContext);
  if (!context) {
    throw new Error("useVideoCall must be used within a VideoCallProvider");
  }
  return context;
}

export function useVideoCallActions() {
  const context = useContext(VideoCallActionsContext);
  if (!context) {
    throw new Error("useVideoCallActions must be used within a VideoCallProvider");
  }
  return context;
}
