import { Server as SocketServer, Socket } from "socket.io";
import { RedisManager } from "./utils/redisClient";

/*
1-> as soon as a user logins, 
save his details like userID, username, with a groupg name -> authenticatedUser and key:socketId and value as json object using redisManager methods chacheData 
2-> if a user is logout out or he is trying to access our resouce but his tokens(login are expired) so take out by remoing his data from above grp  
3-> do not alter the logic written above
*/

const handleSocketAuth = async (
  channel: string,
  msg: string
): Promise<{ userId: string; mobNum: string; status: string } | null> => {
  try {
    const { userId, status, mobNum } = JSON.parse(msg);
    if ((status === "verified" || status === "refreshed") && userId && mobNum) {
      return { userId, mobNum, status };
    }
    return null;
  } catch (error) {
    console.error("Error handling socket auth:", error);
    return null;
  }
};

const monitorConnections = () => {
  setInterval(async () => {
    try {
      const sockets = await RedisManager.getAllFromGroup(
        "socketAuthenticatedUsers"
      );
      console.log(`Active connections: ${sockets.length}`);

      // Log connections per user with error handling
      const userConnections = sockets.reduce((acc, socket) => {
        if (socket.userId) {
          // Add null check for userId
          acc[socket.userId] = (acc[socket.userId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      console.log("Connections per user:", userConnections);
    } catch (error) {
      console.error("Error monitoring connections:", error);
    }
  }, 10 * 60 * 1000); // Every 5 minutes
};

const SocketManager = (io: SocketServer) => {
  /* How Socket.IO handles multiple connections:
   *
   * 1. SocketManager is initialized ONCE when server starts
   * 2. io.on("connection") creates an event listener that stays active
   * 3. Each time a client connects:
   *    - A new Socket instance is created with unique socket.id
   *    - The connection callback runs independently for that socket
   *    - All event listeners are set up for just that socket
   *
   * Example flow:
   * Server starts → SocketManager(io)
   * Client 1 connects → New Socket("abc123") → Runs connection callback
   * Client 2 connects → New Socket("def456") → Runs connection callback
   * Client 1 disconnects → Cleanup just "abc123"
   * Client 3 connects → New Socket("ghi789") → Runs connection callback
   */

  // Initialize monitoring once when server starts
  monitorConnections();

  io.on("connection", async (socket: Socket) => {
    console.log("New connection attempt", socket.id);

    try {
      // First get authentication data
      const userData = await RedisManager.subscribeToChannel(
        process.env.REDIS_CHANNEL!,
        handleSocketAuth
      );

      if (!userData) {
        console.log("Authentication failed", socket.id);
        socket.disconnect(true);
        return;
      }

      // After authentication, check for existing socket with same ID
      const isExisting = await RedisManager.isKeyInGroup(
        "socketAuthenticatedUsers",
        socket.id
      );

      if (isExisting) {
        if (userData.status === "refreshed") {
          const socketData = (await RedisManager.getDataFromGroup(
            "socketAuthenticatedUsers",
            socket.id
          )) as {
            userId: string;
            mobNum: string;
            socketId: string;
            connectedAt: number;
            lastRefreshedAt: number;
          };
          // Update existing socket data
          await RedisManager.cacheDataInGroup(
            "socketAuthenticatedUsers",
            socket.id,
            {
              ...socketData,
              lastRefreshedAt: Date.now(),
            },
            25 * 60 * 60 // 25 hour TTL
          );
          console.log("Updated existing socket data", socket.id);
        } else {
          // If status is "verified" but socket exists, disconnect old and create new
          await RedisManager.removeDataFromGroup(
            "socketAuthenticatedUsers",
            socket.id
          );
          await RedisManager.cacheDataInGroup(
            "socketAuthenticatedUsers",
            socket.id,
            {
              userId: userData.userId,
              mobNum: userData.mobNum,
              socketId: socket.id,
              connectedAt: Date.now(),
              lastRefreshedAt: Date.now(),
            },
            25 * 60 * 60 // 25 hour TTL
          );
          console.log("Replaced existing socket data", socket.id);
        }
      } else {
        // Store new socket data
        await RedisManager.cacheDataInGroup(
          "socketAuthenticatedUsers",
          socket.id,
          {
            userId: userData.userId,
            mobNum: userData.mobNum,
            socketId: socket.id,
            connectedAt: Date.now(),
            lastRefreshedAt: Date.now(),
          },
          25 * 60 * 60 // 25 hour TTL
        );
        console.log("Stored new socket data", socket.id);
      }

      socket.on("total:sockets", async (callback) => {
        try {
          const sockets = await RedisManager.getAllFromGroup(
            "socketAuthenticatedUsers"
          );

          // Get all connected socket IDs from Socket.IO server
          const connectedSockets = await io.sockets.sockets.keys();
          const connectedSocketsSet = new Set(connectedSockets);

          // Filter Redis sockets to only include actually connected sockets
          const activeSocketCount = sockets.filter((socket) =>
            connectedSocketsSet.has(socket.socketId)
          ).length;

          callback({ total: activeSocketCount });
        } catch (error) {
          console.error("Error getting total sockets:", error);
          callback({ total: 0 });
        }
      });
      // Handle disconnection
      socket.on("disconnect", async () => {
        try {
          console.log(
            `User disconnected - Socket: ${socket.id}, User: ${userData.userId}`
          );
          await RedisManager.removeDataFromGroup(
            "socketAuthenticatedUsers",
            socket.id
          );
        } catch (error) {
          console.error("Error handling disconnect:", error);
        }
      });

      // Handle explicit logout
      socket.on("logout", async () => {
        //  frontend will emit it when user either unstall our app or website cache is cleared or he has logged out
        try {
          console.log(
            `User logged out - Socket: ${socket.id}, User: ${userData.userId}`
          );
          await RedisManager.removeDataFromGroup(
            "socketAuthenticatedUsers",
            socket.id
          );
          socket.disconnect(true);
        } catch (error) {
          console.error("Error handling logout:", error);
        }
      });
    } catch (error) {
      console.error("Error in socket connection:", error);
      socket.disconnect(true);
    }
  });

  // Return utility functions
  return {
    async getSocketStatus() {
      try {
        const sockets = await RedisManager.getAllFromGroup(
          "socketAuthenticatedUsers"
        );
        return sockets.map((socket) => ({
          socketId: socket.socketId,
          userId: socket.userId,
          connectedAt: new Date(socket.connectedAt).toISOString(),
          lastRefreshedAt: socket.lastRefreshedAt
            ? new Date(socket.lastRefreshedAt).toISOString()
            : undefined,
          hoursRemaining: (
            (24 * 60 * 60 * 1000 -
              (Date.now() - (socket.lastRefreshedAt || socket.connectedAt))) /
            (60 * 60 * 1000)
          ).toFixed(2),
        }));
      } catch (error) {
        console.error("Error getting socket status:", error);
        return [];
      }
    },
  };
};

export default SocketManager;
