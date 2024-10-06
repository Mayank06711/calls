import { Server as SocketServer, Socket } from "socket.io";

const verifyAuthenticityOfUser = async (): Promise<Boolean> => {
  // Add your authentication logic here.
  // If authentication fails, return false.
  // If authentication succeeds, return true.
  return true;
};

// This function is used to handle socket connections.
const SocketManager = (io: SocketServer) => {
  io.on("connection", async (socket: Socket) => {
    console.log("a user connected", socket.id);
    // Async operation to verify user's authenticity
    const isAuthenticated = await verifyAuthenticityOfUser();

    if (!isAuthenticated) {
      console.log("User not authenticated", socket.id);
      // Disconnect the user if not authenticated
      socket.disconnect(true);
      return;
    }
    
    socket.on("disconnect", () => {
      console.log("user disconnected", socket.id);
    });
  });
};
export default SocketManager;
