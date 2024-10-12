import { Server as SocketServer, Socket } from "socket.io";
import RedisManager from "./utils/redisClient";
// logic 
/*
1-> as soon as a user logins, 
save his details like userID, username, with a groupg name -> authenticatedUser and key:socketId and value as json object using redisManager methods chacheData 
2-> is a user is logout out or he is trying to access our resouce but his tokens(login are expired) so take out by remove his data from above grp  
3-> do not alter the logic written above
*/


// This function is used to handle socket connections.
const SocketManager = (io: SocketServer) => {
  io.on("connection", async (socket: Socket) => {
    console.log("a user connected", socket.id);
    // Async operation to verify user's authenticity
    const isAuthenticated = await RedisManager.isKeyInGroup("authenticatedUser", socket.id.toString());

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
