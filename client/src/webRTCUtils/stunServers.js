let peerConfiguration = {
  iceServers: [
    {
      urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"],
    },
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "e7589e8ec4a0412d30e71018",
      credential: "caEbrP3fTPjyEFOo",
    },
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
      username: "e7589e8ec4a0412d30e71018",
      credential: "caEbrP3fTPjyEFOo",
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "e7589e8ec4a0412d30e71018",
      credential: "caEbrP3fTPjyEFOo",
    },
    {
      urls: "turns:a.relay.metered.ca:443?transport=tcp",
      username: "e7589e8ec4a0412d30e71018",
      credential: "caEbrP3fTPjyEFOo",
    },
  ],
  iceCandidatePoolSize: 10,
};

export default peerConfiguration;
