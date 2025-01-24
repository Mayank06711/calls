import { createSocket } from "./config.js";

const authenticate = (payload) => {
  const socket = createSocket(true);
  socket.connect();
  console.log("socket connected");
  socket.emit("authenticate", payload, (response) => {
    console.log("authentication response", response);
  });
};

export {authenticate};
