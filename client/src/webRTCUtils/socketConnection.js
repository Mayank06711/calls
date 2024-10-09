import { io } from "socket.io-client";
const URL = "https://localhost:5005";
let socket;
const socketConnection = (jwt) => {
  console.log(jwt, "socket jwt")
  //check to see if the socket is already connected
  if (socket && socket.connected) {
    //if so, then just return it so whoever needs it, can use it
    return socket;
  } else {
    //its not connected... connect!
    console.log("Attempting to connect to socket...");
    socket = io.connect(URL, {
      auth: {
        jwt,
      },
    });
    console.log("Socket connected:", socket);
    socket.on("connect", () => {
      console.log("Socket connected successfully!");
    })
    return socket;
  }
};

export default socketConnection;
