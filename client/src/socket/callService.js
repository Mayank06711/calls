const emitWithTimeout = (socket, event, data, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket not initialized"));
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error("Request timeout"));
    }, timeout);

    socket.emit(event, data, (response) => {
      clearTimeout(timer);
      resolve(response);
    });
  });
};

class CallService {
  constructor(socket) {
    this.socket = socket;
    this.events = new Map();
  }

  /**
   * Register all call-related socket listeners
   */
  initializeCallListeners(callbacks) {
    if (!this.socket) {
      console.warn("[CallService] Socket not initialized");
      return () => {};
    }

    const events = {
      "call:incoming": callbacks.onIncomingCall,
      "call:accepted": callbacks.onCallAccepted,
      "call:rejected": callbacks.onCallRejected,
      "call:ended": callbacks.onCallEnded,
      "call:missed": callbacks.onCallMissed,
      "call:missed-incoming": callbacks.onMissedIncoming,
      "call:busy": callbacks.onCallBusy,
      "call:offer": callbacks.onOffer,
      "call:answer": callbacks.onAnswer,
      "call:ice-candidate": callbacks.onIceCandidate,
      "call:media-state": callbacks.onMediaState,
      "call:permission-request": callbacks.onPermissionRequest,
      "call:permission-granted": callbacks.onPermissionGranted,
      "call:permission-denied": callbacks.onPermissionDenied,
      "call:time-warning": callbacks.onTimeWarning,
    };

    Object.entries(events).forEach(([event, handler]) => {
      if (this.socket && typeof handler === "function") {
        // Remove existing listener to prevent duplicates
        const existing = this.events.get(event);
        if (existing) {
          this.socket.off(event, existing);
        }
        this.socket.on(event, handler);
        this.events.set(event, handler);
      }
    });

    return () => {
      if (this.socket) {
        this.events.forEach((handler, event) => {
          this.socket.off(event, handler);
        });
        this.events.clear();
      }
    };
  }

  /**
   * Initiate a call to another user
   */
  async initiateCall(calleeId) {
    try {
      const response = await emitWithTimeout(
        this.socket,
        "call:initiate",
        { calleeId, timestamp: Date.now() },
        10000
      );
      return response;
    } catch (error) {
      console.error("[CallService] initiateCall error:", error);
      throw error;
    }
  }

  /**
   * Accept an incoming call
   */
  async acceptCall(callId) {
    try {
      const response = await emitWithTimeout(this.socket, "call:accept", {
        callId,
      });
      return response;
    } catch (error) {
      console.error("[CallService] acceptCall error:", error);
      throw error;
    }
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(callId, reason) {
    try {
      const response = await emitWithTimeout(this.socket, "call:reject", {
        callId,
        reason,
      });
      return response;
    } catch (error) {
      console.error("[CallService] rejectCall error:", error);
      throw error;
    }
  }

  /**
   * End an active call
   */
  async endCall(callId, reason) {
    try {
      const response = await emitWithTimeout(this.socket, "call:end", {
        callId,
        reason,
      });
      return response;
    } catch (error) {
      console.error("[CallService] endCall error:", error);
      throw error;
    }
  }

  /**
   * Send SDP offer to remote peer via server relay
   */
  sendOffer(callId, sdp) {
    if (!this.socket) return;
    this.socket.emit("call:offer", { callId, sdp });
  }

  /**
   * Send SDP answer to remote peer via server relay
   */
  sendAnswer(callId, sdp) {
    if (!this.socket) return;
    this.socket.emit("call:answer", { callId, sdp });
  }

  /**
   * Send ICE candidate to remote peer via server relay
   */
  sendIceCandidate(callId, candidate) {
    if (!this.socket) return;
    this.socket.emit("call:ice-candidate", { callId, candidate });
  }

  /**
   * Toggle video on/off and notify remote peer
   */
  toggleVideo(callId, enabled) {
    if (!this.socket) return;
    this.socket.emit("call:toggle-video", { callId, enabled });
  }

  /**
   * Toggle audio on/off and notify remote peer
   */
  toggleAudio(callId, enabled) {
    if (!this.socket) return;
    this.socket.emit("call:toggle-audio", { callId, enabled });
  }

  /**
   * Request permission to call a user (expert flow)
   */
  async requestPermission(userId) {
    try {
      const response = await emitWithTimeout(
        this.socket,
        "call:request-permission",
        { userId },
        10000
      );
      return response;
    } catch (error) {
      console.error("[CallService] requestPermission error:", error);
      throw error;
    }
  }

  /**
   * Respond to an expert's permission request
   */
  async respondToPermission(expertId, accepted) {
    try {
      const response = await emitWithTimeout(
        this.socket,
        "call:permission-response",
        { expertId, accepted }
      );
      return response;
    } catch (error) {
      console.error("[CallService] respondToPermission error:", error);
      throw error;
    }
  }

  /**
   * Update socket reference (e.g. after reconnection)
   */
  updateSocket(socket) {
    this.socket = socket;
    if (this.events.size > 0) {
      this.events.forEach((handler, event) => {
        this.socket?.on(event, handler);
      });
    }
  }

  /**
   * Cleanup all listeners and resources
   */
  destroy() {
    if (this.socket) {
      this.events.forEach((handler, event) => {
        this.socket.off(event, handler);
      });
    }
    this.events.clear();
  }
}

export default CallService;
