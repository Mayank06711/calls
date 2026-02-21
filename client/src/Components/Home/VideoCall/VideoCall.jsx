import React, { useRef, useEffect, useState, useCallback } from "react";
import { useVideoCall, CALL_STATES } from "../../../hooks/useVideoCall";
import {
  CallEnd,
  Videocam,
  VideocamOff,
  Mic,
  MicOff,
  Lock,
  OpenInFull,
  CloseFullscreen,
} from "@mui/icons-material";

function VideoCall() {
  const {
    callState,
    isCaller,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    remoteVideoEnabled,
    remoteAudioEnabled,
    duration,
    remoteUserInfo,
    endReason,
    endCall,
    toggleVideo,
    toggleAudio,
    isVideoSwapped,
    toggleVideoSwap,
    timeWarning,
  } = useVideoCall();

  const fullscreenVideoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    if (callState === CALL_STATES.CONNECTED && !isMinimized) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    }
  }, [callState, isMinimized]);

  // Auto-hide controls after 4s when connected (not minimized)
  useEffect(() => {
    if (callState === CALL_STATES.CONNECTED && !isMinimized) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    } else {
      setShowControls(true);
      clearTimeout(controlsTimerRef.current);
    }
    if (callState !== CALL_STATES.CONNECTED) {
      setIsMinimized(false);
    }
    return () => clearTimeout(controlsTimerRef.current);
  }, [callState, isMinimized]);

  // Assign streams based on swap state
  useEffect(() => {
    const fullscreenStream = isVideoSwapped ? localStream : remoteStream;
    const pipStream = isVideoSwapped ? remoteStream : localStream;
    if (fullscreenVideoRef.current) {
      fullscreenVideoRef.current.srcObject = fullscreenStream;
    }
    if (pipVideoRef.current) {
      pipVideoRef.current.srcObject = pipStream;
    }
  }, [localStream, remoteStream, isVideoSwapped, isMinimized]);

  // Only show during active call states (not idle)
  if (
    callState === CALL_STATES.IDLE ||
    (callState === CALL_STATES.RINGING && !isCaller)
  ) {
    return null;
  }

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case CALL_STATES.RINGING:
        return "Ringing...";
      case CALL_STATES.CONNECTING:
        return "Connecting...";
      case CALL_STATES.CONNECTED:
        return formatDuration(duration);
      case CALL_STATES.ENDED:
        if (endReason === "rejected") return "Call Declined";
        if (endReason === "missed") return "No Answer";
        if (endReason === "busy") return "User Busy";
        if (endReason === "CALLEE_OFFLINE") return "User Offline";
        if (endReason === "CALLEE_BUSY") return "User Busy";
        if (endReason === "media_error") return "Camera/Mic Error";
        if (endReason === "connection_lost") return "Connection Lost";
        if (endReason === "time_limit") return "Time Limit Reached";
        return "Call Ended";
      default:
        return "";
    }
  };

  // Determine what's showing in fullscreen vs PiP based on swap
  const fullscreenIsLocal = isVideoSwapped;
  const fullscreenVideoOn = fullscreenIsLocal ? isVideoEnabled : remoteVideoEnabled;
  const fullscreenStream = fullscreenIsLocal ? localStream : remoteStream;
  const pipVideoOn = fullscreenIsLocal ? remoteVideoEnabled : isVideoEnabled;
  const pipStream = fullscreenIsLocal ? remoteStream : localStream;
  const pipIsLocal = !fullscreenIsLocal;

  const formatTimeWarning = (remaining) => {
    const m = Math.ceil(remaining / 60);
    return m <= 1 ? "Call ending in less than 1 minute" : `Call ending in ${m} minutes`;
  };

  // Minimized/PiP view during connected call
  if (isMinimized && callState === CALL_STATES.CONNECTED) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-64 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 bg-gray-900">
        <div
          className="relative w-full h-36 bg-black cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <video
            ref={fullscreenVideoRef}
            autoPlay
            playsInline
            muted={fullscreenIsLocal}
            className="w-full h-full object-cover"
            style={{
              display: fullscreenStream && fullscreenVideoOn ? "block" : "none",
              transform: fullscreenIsLocal ? "scaleX(-1)" : "none",
            }}
          />
          {(!fullscreenStream || !fullscreenVideoOn) && (
            <div className="w-full h-full flex items-center justify-center bg-gray-800">
              {remoteUserInfo?.avatar ? (
                <img
                  src={remoteUserInfo.avatar}
                  alt={remoteUserInfo.name || "User"}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                  <span className="text-xl font-bold text-gray-400">
                    {remoteUserInfo?.name?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
            <OpenInFull sx={{ fontSize: 12 }} className="text-white" />
          </div>
          <div className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 rounded text-white text-xs font-medium">
            {formatDuration(duration)}
          </div>
          <div className="absolute bottom-2 left-2 text-white text-xs font-medium bg-black/40 px-2 py-0.5 rounded truncate max-w-[80%]">
            {remoteUserInfo?.name || "Video Call"}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 py-2.5">
          <button
            onClick={toggleVideo}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isVideoEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600"
            }`}
          >
            {isVideoEnabled ? (
              <Videocam sx={{ fontSize: 18 }} className="text-white" />
            ) : (
              <VideocamOff sx={{ fontSize: 18 }} className="text-white" />
            )}
          </button>
          <button
            onClick={endCall}
            className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all active:scale-95"
          >
            <CallEnd sx={{ fontSize: 20 }} className="text-white" />
          </button>
          <button
            onClick={toggleAudio}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isAudioEnabled ? "bg-gray-700 hover:bg-gray-600" : "bg-red-600"
            }`}
          >
            {isAudioEnabled ? (
              <Mic sx={{ fontSize: 18 }} className="text-white" />
            ) : (
              <MicOff sx={{ fontSize: 18 }} className="text-white" />
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
    >
      {/* Time warning banner */}
      {timeWarning && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-amber-500 text-black text-center py-2 px-4 text-sm font-semibold">
          {formatTimeWarning(timeWarning.remaining)}
        </div>
      )}

      {/* Full-screen video area */}
      <div className="w-full h-full relative overflow-hidden bg-black">
        <video
          ref={fullscreenVideoRef}
          autoPlay
          playsInline
          muted={fullscreenIsLocal}
          className="w-full h-full object-cover"
          style={{
            display: fullscreenStream && fullscreenVideoOn ? "block" : "none",
            transform: fullscreenIsLocal ? "scaleX(-1)" : "none",
          }}
        />

        {/* Avatar fallback when fullscreen video is off (hidden during ringing/connecting — those have their own overlay) */}
        {(!fullscreenStream || !fullscreenVideoOn) &&
          callState !== CALL_STATES.CONNECTING &&
          callState !== CALL_STATES.RINGING && (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            {remoteUserInfo?.avatar ? (
              <img
                src={remoteUserInfo.avatar}
                alt={remoteUserInfo.name || "User"}
                className="w-28 h-28 rounded-full object-cover"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-4xl font-bold text-gray-400">
                  {remoteUserInfo?.name
                    ? remoteUserInfo.name.charAt(0).toUpperCase()
                    : "?"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Top bar overlay: status, timer, encryption badge */}
        <div
          className={`absolute ${timeWarning ? "top-10" : "top-0"} left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent transition-all duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium opacity-80">
                {remoteUserInfo?.name || "Video Call"}
              </p>
              <p className="text-white text-lg font-semibold">
                {getStatusText()}
              </p>
              {/* Encryption badge */}
              {callState === CALL_STATES.CONNECTED && (
                <div className="flex items-center gap-1 mt-1 opacity-70">
                  <Lock sx={{ fontSize: 12 }} className="text-green-400" />
                  <span className="text-green-400 text-[10px]">
                    End-to-end encrypted (DTLS-SRTP)
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!remoteAudioEnabled && callState === CALL_STATES.CONNECTED && (
                <div className="bg-red-600/80 px-2 py-1 rounded text-white text-xs">
                  {remoteUserInfo?.name || "Remote"} Muted
                </div>
              )}
              {callState === CALL_STATES.CONNECTED && (
                <button
                  onClick={() => setIsMinimized(true)}
                  className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <CloseFullscreen sx={{ fontSize: 16 }} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PiP — tap to swap */}
        {pipStream && (
          <div
            onClick={toggleVideoSwap}
            className={`absolute right-4 w-32 h-44 rounded-xl overflow-hidden shadow-lg border-2 border-gray-700 bg-gray-800 cursor-pointer active:scale-95 transition-all duration-300 ${
              showControls ? "bottom-28" : "bottom-4"
            }`}
          >
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted={pipIsLocal}
              className="w-full h-full object-cover"
              style={{
                transform: pipIsLocal ? "scaleX(-1)" : "none",
                display: pipVideoOn ? "block" : "none",
              }}
            />
            {/* Camera-off overlay for PiP */}
            {!pipVideoOn && (
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <VideocamOff className="text-gray-400" />
              </div>
            )}
          </div>
        )}

        {/* Connecting overlay */}
        {(callState === CALL_STATES.CONNECTING ||
          callState === CALL_STATES.RINGING) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="text-center">
              {remoteUserInfo?.avatar ? (
                <img
                  src={remoteUserInfo.avatar}
                  alt={remoteUserInfo.name || "User"}
                  className="w-20 h-20 rounded-full object-cover mx-auto mb-4"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-gray-300">
                    {remoteUserInfo?.name
                      ? remoteUserInfo.name.charAt(0).toUpperCase()
                      : "?"}
                  </span>
                </div>
              )}
              <p className="text-white text-lg font-semibold mb-1">
                {remoteUserInfo?.name || "Unknown"}
              </p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-white text-sm opacity-80">
                  {getStatusText()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ended overlay */}
        {callState === CALL_STATES.ENDED && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <p className="text-white text-xl font-semibold">
              {getStatusText()}
            </p>
          </div>
        )}

        {/* Bottom controls overlay */}
        {callState !== CALL_STATES.ENDED && (
          <div
            className={`absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 py-6 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            {/* Toggle video */}
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoEnabled
                  ? "bg-gray-700/80 hover:bg-gray-600/80"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isVideoEnabled ? (
                <Videocam className="text-white" />
              ) : (
                <VideocamOff className="text-white" />
              )}
            </button>

            {/* End call */}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg transition-all active:scale-95"
            >
              <CallEnd className="text-white" sx={{ fontSize: 30 }} />
            </button>

            {/* Toggle audio */}
            <button
              onClick={toggleAudio}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isAudioEnabled
                  ? "bg-gray-700/80 hover:bg-gray-600/80"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {isAudioEnabled ? (
                <Mic className="text-white" />
              ) : (
                <MicOff className="text-white" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoCall;
