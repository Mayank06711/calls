import { Server as SocketServer, Socket } from "socket.io";
import { RedisManager } from "./utils/redisClient";
import { EmitOptions } from "./types/interface";
import { SocketUserData } from "./types/interface";
import { SocketData } from "./types/interface";
/*
1-> as soon as a user logins, 
save his details like userID, username, with a groupg name -> authenticatedUser and key:socketId and value as json object using redisManager methods chacheData 
2-> if a user is logout out or he is trying to access our resouce but his tokens(login are expired) so take out by remoing his data from above grp  
3-> do not alter the logic written above
*/

class SocketManager {
  /**
   * SocketManager: Singleton class for managing Socket.IO connections
   *
   * Lifecycle:
   * 1. Server Initialization:
   *    - Server starts
   *    - First call to SocketManager.getInstance(io) creates singleton
   *    - Constructor runs ONCE, setting up connection listener
   *
   * 2. Connection Management:
   *    - io.on("connection") listener stays active
   *    - Each new client connection creates new Socket instance
   *    - Each socket gets its own event handlers
   *
   * Example Flow:
   * └─ Server Start
   *    └─ SocketManager.getInstance(io)
   *       └─ new SocketManager(io) [runs once]
   *          └─ initializeSocket() [sets up permanent connection listener]
   *             └─ io.on("connection") [waits for connections]
   *
   * Then for each client:
   * └─ Client Connects
   *    └─ New Socket Created (unique ID)
   *       └─ handleSocketConnection()
   *          ├─ Authentication
   *          ├─ Setup Event Listeners
   *          └─ Store Socket Data
   */
  private static instance: SocketManager | null = null;
  private io: SocketServer;

  /**
   * Private constructor ensures singleton pattern
   * Runs ONCE when first instance is created
   */
  private constructor(io: SocketServer) {
    this.io = io;
    this.initializeSocket();
    this.monitorConnections();
  }

  public static getInstance(io?: SocketServer): SocketManager {
    if (!SocketManager.instance) {
      if (!io) {
        throw new Error("Socket.IO instance required for initialization");
      }
      SocketManager.instance = new SocketManager(io);
    }
    return SocketManager.instance;
  }

  private initializeSocket(): void {
    this.io.on("connection", async (socket: Socket) => {
      console.log("New connection attempt", socket.id);
      // Add this condition for testing
      if (process.env.NODE_ENV === "dev") {
        console.log("Test connection - skipping authentication");
        await this.handleSocketConnection(socket, {
          userId: "test-user",
          mobNum: "test-number",
          status: "verified",
        });
        this.setupEventListeners(socket, { userId: "test-user" });
        return;
      }

      let lockId: string | null = null;
      let userData: any = null;

      try {
        userData = await RedisManager.subscribeToChannel(
          process.env.REDIS_CHANNEL!,
          this.handleSocketAuth
        ).catch((error) => {
          console.error("Authentication subscription error:", error);
          throw new Error("Authentication failed");
        });

        if (!userData) {
          throw new Error("Authentication failed - no user data");
        }

        const lockKey = `user:${userData.userId}`;
        lockId = await RedisManager.acquireLock(lockKey, 5000);

        if (!lockId) {
          throw new Error("Connection blocked - concurrent connection attempt");
        }

        await this.handleSocketConnection(socket, userData);
        this.setupEventListeners(socket, userData);
      } catch (error) {
        console.error("Error in socket connection:", error);
        this.handleConnectionError(socket, error);
      } finally {
        await this.cleanupLock(lockId, userData);
      }
    });
  }

  private async handleSocketAuth(channel: string, msg: string) {
    try {
      const { userId, status, mobNum } = JSON.parse(msg);
      if (
        (status === "verified" || status === "refreshed") &&
        userId &&
        mobNum
      ) {
        return { userId, mobNum, status };
      }
      return null;
    } catch (error) {
      console.error("Error handling socket auth:", error);
      return null;
    }
  }

  private async handleSocketConnection(socket: Socket, userData: any) {
    const isExisting = await RedisManager.isKeyInGroup(
      "socketAuthenticatedUsers",
      socket.id
    );
    console.log(isExisting, "IsExisting");
    if (isExisting) {
      if (userData.status === "refreshed") {
        await this.handleRefreshedSocket(socket, userData);
      } else {
        await this.handleReplacementSocket(socket, userData);
      }
    } else {
      await this.handleNewSocket(socket, userData);
    }
  }

  private async handleRefreshedSocket(socket: Socket, userData: any) {
    const socketData = (await RedisManager.getDataFromGroup(
      "socketAuthenticatedUsers",
      socket.id
    )) as SocketData;

    await RedisManager.cacheDataInGroup(
      "socketAuthenticatedUsers",
      socket.id,
      {
        ...socketData,
        lastRefreshedAt: Date.now(),
      },
      25 * 60 * 60
    );
    console.log("Updated existing socket data", socket.id);
  }

  private async handleReplacementSocket(socket: Socket, userData: any) {
    await RedisManager.removeDataFromGroup(
      "socketAuthenticatedUsers",
      socket.id
    );
    await this.handleNewSocket(socket, userData);
    console.log("Replaced existing socket data", socket.id);
  }

  private async handleNewSocket(socket: Socket, userData: any) {
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
      25 * 60 * 60
    );
    console.log("Stored new socket data", socket.id);
  }

  private handleConnectionError(socket: Socket, error: unknown) {
    if (error instanceof Error) {
      socket.emit("connection_error", error.message);
    } else {
      socket.emit("connection_error", "Unknown error occurred");
    }
    socket.disconnect(true);
  }

  private async cleanupLock(lockId: string | null, userData: any) {
    if (lockId && userData) {
      const lockKey = `user:${userData.userId}`;
      await RedisManager.releaseLock(lockKey, lockId).catch((error) => {
        console.error("Error releasing lock:", error);
      });
    }
  }

  private async monitorConnections(): Promise<void> {
    setInterval(async () => {
      try {
        const metrics = await this.calculateMetrics();
        this.logMetrics(metrics);
        await this.cleanupZombieSockets(metrics);
        this.checkUserConnections(metrics);
      } catch (error) {
        console.error("Error monitoring connections:", error);
      }
    }, 10 * 60 * 1000);
  }

  private async calculateMetrics() {
    const sockets = await RedisManager.getAllFromGroup(
      "socketAuthenticatedUsers"
    );
    const connectedSockets = await this.io.sockets.sockets.keys();
    const connectedSocketsSet = new Set(connectedSockets);
    const activeSockets = sockets.filter((socket) =>
      connectedSocketsSet.has(socket.socketId)
    );

    const metrics = {
      totalStoredSockets: sockets.length,
      activeConnections: activeSockets.length,
      zombieSockets: sockets.length - activeSockets.length,
      usersMap: new Map<
        string,
        {
          activeCount: number;
          totalCount: number;
          lastActivity: number;
        }
      >(),
    };

    this.calculateUserMetrics(sockets, connectedSocketsSet, metrics.usersMap);
    return metrics;
  }

  private calculateUserMetrics(
    sockets: any[],
    connectedSocketsSet: Set<string>,
    usersMap: Map<string, any>
  ) {
    sockets.forEach((socket) => {
      if (!socket.userId) return;

      const userMetrics = usersMap.get(socket.userId) || {
        activeCount: 0,
        totalCount: 0,
        lastActivity: 0,
      };

      userMetrics.totalCount++;
      if (connectedSocketsSet.has(socket.socketId)) {
        userMetrics.activeCount++;
      }

      const lastActivity = socket.lastRefreshedAt || socket.connectedAt;
      userMetrics.lastActivity = Math.max(
        userMetrics.lastActivity,
        lastActivity
      );

      usersMap.set(socket.userId, userMetrics);
    });
  }

  private logMetrics(metrics: {
    totalStoredSockets: number;
    activeConnections: number;
    zombieSockets: number;
    usersMap: Map<
      string,
      {
        activeCount: number;
        totalCount: number;
        lastActivity: number;
      }
    >;
  }): void {
    type UserMetric = {
      userId: string;
      activeConnections: number;
      totalConnections: number;
      lastActivity: string;
    };

    console.log({
      totalSockets: metrics.totalStoredSockets,
      activeConnections: metrics.activeConnections,
      zombieSockets: metrics.zombieSockets,
      userConnections: [...metrics.usersMap].map(
        ([userId, data]): UserMetric => ({
          userId,
          activeConnections: data.activeCount,
          totalConnections: data.totalCount,
          lastActivity: new Date(data.lastActivity).toISOString(),
        })
      ),
    });
  }

  private async cleanupZombieSockets(metrics: any) {
    if (metrics.zombieSockets > 0) {
      console.log(`Cleaning up ${metrics.zombieSockets} zombie sockets...`);
      const sockets = await RedisManager.getAllFromGroup(
        "socketAuthenticatedUsers"
      );
      const connectedSockets = await this.io.sockets.sockets.keys();
      const connectedSocketsSet = new Set(connectedSockets);

      for (const socket of sockets) {
        if (!connectedSocketsSet.has(socket.socketId)) {
          await RedisManager.removeDataFromGroup(
            "socketAuthenticatedUsers",
            socket.socketId
          ).catch((error) => {
            console.error(
              `Error cleaning up zombie socket ${socket.socketId}:`,
              error
            );
          });
        }
      }
    }
  }

  private checkUserConnections(metrics: any) {
    const MAX_CONNECTIONS_PER_USER = 5;
    for (const [userId, data] of metrics.usersMap) {
      if (data.activeCount > MAX_CONNECTIONS_PER_USER) {
        console.warn(
          `User ${userId} has ${data.activeCount} active connections!`
        );
      }
    }
  }

  private setupEventListeners(socket: Socket, userData: any): void {
    socket.on("total:sockets", async (callback) => {
      try {
        const sockets = await RedisManager.getAllFromGroup(
          "socketAuthenticatedUsers"
        );
        const connectedSockets = await this.io.sockets.sockets.keys();
        const connectedSocketsSet = new Set(connectedSockets);
        const activeSocketCount = sockets.filter((socket) =>
          connectedSocketsSet.has(socket.socketId)
        ).length;
        callback({ total: activeSocketCount });
      } catch (error) {
        console.error("Error getting total sockets:", error);
        callback({ total: 0 });
      }
    });

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

    socket.on("logout", async () => {
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
  }

  public getIO() {
    return this.io;
  }
  // Public utility methods
  public async getSocketStatus() {
    try {
      const sockets = await RedisManager.getAllFromGroup(
        "socketAuthenticatedUsers"
      );
      const connectedSockets = await this.io.sockets.sockets.keys();
      const connectedSocketsSet = new Set(connectedSockets);

      return sockets
        .filter((socket) => connectedSocketsSet.has(socket.socketId))
        .map((socket) => ({
          socketId: socket.socketId,
          userId: socket.userId,
          mobNum: socket.mobNum,
          connectedAt: new Date(socket.connectedAt).toISOString(),
          lastRefreshedAt: socket.lastRefreshedAt
            ? new Date(socket.lastRefreshedAt).toISOString()
            : undefined,
          hoursRemaining: Number(
            (
              (25 * 60 * 60 * 1000 -
                (Date.now() - (socket.lastRefreshedAt || socket.connectedAt))) /
              (60 * 60 * 1000)
            ).toFixed(2)
          ),
          isActive: connectedSocketsSet.has(socket.socketId),
          lastActivityAt: socket.lastRefreshedAt || socket.connectedAt,
        }))
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);
    } catch (error) {
      console.error("Error getting socket status:", error);
      return [];
    }
  }

  public async getActiveUserCount(): Promise<number> {
    try {
      const sockets = await RedisManager.getAllFromGroup(
        "socketAuthenticatedUsers"
      );
      const connectedSockets = await this.io.sockets.sockets.keys();
      const connectedSocketsSet = new Set(connectedSockets);

      const activeUsers = new Set(
        sockets
          .filter((socket) => connectedSocketsSet.has(socket.socketId))
          .map((socket) => socket.userId)
      );

      return activeUsers.size;
    } catch (error) {
      console.error("Error getting active user count:", error);
      return 0;
    }
  }

  public async disconnectUser(userId: string): Promise<number> {
    try {
      const sockets = await RedisManager.getAllFromGroup(
        "socketAuthenticatedUsers"
      );
      const userSockets = sockets.filter((socket) => socket.userId === userId);

      for (const socketData of userSockets) {
        const socket = this.io.sockets.sockets.get(socketData.socketId);
        if (socket) {
          socket.emit("forced_disconnect", "User disconnected by system");
          socket.disconnect(true);
        }
        await RedisManager.removeDataFromGroup(
          "socketAuthenticatedUsers",
          socketData.socketId
        );
      }

      return userSockets.length;
    } catch (error) {
      console.error(`Error disconnecting user ${userId}:`, error);
      return 0;
    }
  }

  public async emitEvent({
    event,
    data,
    room,
    auth = false,
    headers = {},
    targetSocketIds,
  }: EmitOptions): Promise<boolean> {
    try {
      const payload = {
        data,
        ...(auth && { auth: true }),
        ...(Object.keys(headers).length > 0 && { headers }),
        timestamp: new Date().toISOString(),
      };

      if (targetSocketIds && targetSocketIds.length > 0) {
        targetSocketIds.forEach((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit(event, payload);
          }
        });
        console.log(
          `Event ${event} emitted to specific sockets:`,
          targetSocketIds
        );
      } else if (room) {
        this.io.to(room).emit(event, payload);
        console.log(`Event ${event} emitted to room: ${room}`);
      } else {
        this.io.emit(event, payload);
        console.log(`Event ${event} broadcasted to all clients`);
      }

      return true;
    } catch (error) {
      console.error(`Error emitting event ${event}:`, error);
      return false;
    }
  }
  public async cleanup(): Promise<void> {
    try {
      const sockets = await RedisManager.getAllFromGroup(
        "socketAuthenticatedUsers"
      );

      // Parallel processing for faster cleanup
      await Promise.all(
        sockets.map(async (socketData) => {
          const socket = this.io.sockets.sockets.get(socketData.socketId);
          if (socket) {
            socket.emit("server_shutdown", "Server is shutting down");
            socket.disconnect(true);
          }
          return RedisManager.removeDataFromGroup(
            "socketAuthenticatedUsers",
            socketData.socketId
          );
        })
      );

      this.io.disconnectSockets(true);
      console.log("Socket cleanup completed");
    } catch (error) {
      console.error("Error during socket cleanup:", error);
      throw error;
    }
  }
}

export { SocketManager };
