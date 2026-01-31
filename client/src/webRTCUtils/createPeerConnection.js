import peerConfiguration from "./stunServers";

const createPeerConnection = (addIce, onConnectionStateChange) => {
  return new Promise((resolve, reject) => {
    try {
      const peerConnection = new RTCPeerConnection(peerConfiguration);
      const remoteStream = new MediaStream();

      peerConnection.addEventListener("signalingstatechange", () => {
        console.log("[WebRTC] Signaling state:", peerConnection.signalingState);
      });

      peerConnection.addEventListener("icecandidate", (e) => {
        if (e.candidate) {
          console.log("[WebRTC] Found ICE candidate");
          addIce(e.candidate);
        }
      });

      peerConnection.addEventListener("iceconnectionstatechange", () => {
        const state = peerConnection.iceConnectionState;
        console.log("[WebRTC] ICE connection state:", state);

        if (state === "failed") {
          console.log("[WebRTC] ICE failed — attempting restart");
          peerConnection.restartIce();
        }
      });

      peerConnection.addEventListener("connectionstatechange", () => {
        const state = peerConnection.connectionState;
        console.log("[WebRTC] Connection state:", state);
        if (onConnectionStateChange) {
          onConnectionStateChange(state);
        }
      });

      peerConnection.addEventListener("icegatheringstatechange", () => {
        console.log(
          "[WebRTC] ICE gathering state:",
          peerConnection.iceGatheringState
        );
      });

      peerConnection.addEventListener("track", (e) => {
        console.log("[WebRTC] Got remote track:", e.track.kind);
        e.streams[0].getTracks().forEach((track) => {
          remoteStream.addTrack(track);
        });
      });

      resolve({
        peerConnection,
        remoteStream,
      });
    } catch (err) {
      console.error("[WebRTC] Failed to create peer connection:", err);
      reject(err);
    }
  });
};

export default createPeerConnection;
