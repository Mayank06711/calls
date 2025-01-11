import { Server as SocketServer, Socket } from "socket.io";
import { AuthServices } from "./helper/auth";
import { RedisManager } from "./utils/redisClient";
import { EmitOptions } from "./types/interface";
import { FileHandler } from "./helper/fileHandler";
import { SocketUserData } from "./types/interface";
import { SocketData } from "./types/interface";

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

class SocketManager {
  // 1. Core Initialization & Setup
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
      if (
        process.env.NODE_ENV === "dev" ||
        socket.handshake.query.testMode === "true"
      ) {
        console.log("Test connection - skipping authentication");
        const testUserData = {
          userId: (socket.handshake.query.userId as string) || "test-user",
          mobNum:
            (socket.handshake.query.phoneNumber as string) || "test-number",
          status: "authenticated",
        };

        await this.handleSocketConnection(socket, testUserData);
        this.setupEventListeners(socket, testUserData);

        // Add authentication event listener for test mode
        socket.on("authenticate", async (authData: any, callback) => {
          callback({
            status: "success",
            message: "Test mode authentication successful",
            socketId: socket.id,
          });
        });
        // Important: Emit authentication success for test mode
        socket.emit("authenticate", {
          status: "success",
          message: "Test mode authentication successful",
          socketId: socket.id,
        });
        return;
      }

      // Set a timeout for authentication
      const authTimeout = setTimeout(() => {
        if (!socket.data.authenticated) {
          socket.emit("auth_timeout", "Authentication timeout");
          socket.disconnect(true);
        }
      }, 30000); // 30 seconds to authenticate

      let lockId: string | null = null;
      let userData: any = null;

      socket.on(
        "authenticate",
        async (
          authData: { refreshToken?: string; accessToken?: string },
          callback
        ) => {
          try {
            clearTimeout(authTimeout);
            console.log(authData, "got auth data");
            if (!authData.refreshToken && !authData.accessToken) {
              callback({
                status: "error",
                message: "Auth Data Not Found",
                socketId: socket.id,
              });
              return this.handleConnectionError(socket, "Auth Data Not Found");
            }

            // Verify tokens and get user data
            userData = await this.verifyUserAuthentication(authData);

            if (!userData) {
              callback({
                status: "error",
                message: "Invalid authentication",
                socketId: socket.id,
              });
              return this.handleConnectionError(
                socket,
                "Invalid authentication"
              );
            }
            const lockKey = `user:${userData.userId}`;
            lockId = await RedisManager.acquireLock(lockKey, 5000);

            if (!lockId) {
              callback({
                status: "error",
                message: "Connection blocked - concurrent connection attempt",
                socketId: socket.id,
              });
              return this.handleConnectionError(
                socket,
                "Connection blocked - concurrent connection attempt"
              );
            }
            // Check for existing connections
            await this.handleExistingConnections(userData.userId);

            // Store socket connection data
            await this.handleSocketConnection(socket, userData);

            socket.data.authenticated = true;
            socket.data.userId = userData.userId;

            // Setup other event listeners
            this.setupEventListeners(socket, userData);
            callback({
              status: userData.status,
              message: "Authentication successful",
              socketId: socket.id,
            });
          } catch (error) {
            callback({
              status: "error",
              message: "Authentication failed, Unexpected error occurred",
              socketId: socket.id,
            });
            console.error("Authentication error:", error);
            this.handleConnectionError(
              socket,
              "Authentication failed, Unexpected error occured"
            );
          } finally {
            await this.cleanupLock(lockId, userData);
          }
        }
      );
    });
  }

  // 2. Authentication & Connection Handling
  private async verifyUserAuthentication(authData: {
    refreshToken?: string;
    accessToken?: string;
  }) {
    try {
      let userData;

      if (authData.accessToken) {
        // First try with access token
        userData = await AuthServices.verifyJWT_Token(
          authData.accessToken,
          "access"
        );
        if (userData) {
          return userData;
        }
      }

      if (authData.refreshToken) {
        // If access token fails or isn't present, try refresh token
        userData = await AuthServices.verifyJWT_Token(
          authData.refreshToken,
          "refresh"
        );
        if (userData) {
          return userData;
        }
      }
      return null;
    } catch (error) {
      console.error("Token verification error:", error);
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
        status: userData.status,
      },
      25 * 60 * 60
    );
    console.log("Stored new socket data", socket.id);
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
        status: "refreshed",
        userId: userData.userId, // Ensure we update with latest data
        mobNum: userData.mobNum,
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

  private async handleExistingConnections(userId: string) {
    const existingSockets = await RedisManager.getAllFromGroup(
      "socketAuthenticatedUsers"
    );
    const userSockets = existingSockets.filter(
      (socket) => socket.userId === userId
    );

    // If user has too many connections, disconnect oldest ones
    const MAX_CONNECTIONS_PER_USER = 5;
    if (userSockets.length >= MAX_CONNECTIONS_PER_USER) {
      // Sort by connection time and keep only the newest ones
      userSockets.sort((a, b) => b.connectedAt - a.connectedAt);

      // Disconnect oldest connections
      for (let i = MAX_CONNECTIONS_PER_USER - 1; i < userSockets.length; i++) {
        const socket = this.io.sockets.sockets.get(userSockets[i].socketId);
        if (socket) {
          socket.emit("forced_disconnect", "Too many connections");
          socket.disconnect(true);
        }
        await RedisManager.removeDataFromGroup(
          "socketAuthenticatedUsers",
          userSockets[i].socketId
        );
      }
    }
  }

  private handleConnectionError(socket: Socket, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    socket.emit("connection_error", errorMessage);
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

  // 3. Event Listeners
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
    this.listenToEvent({
      event: "file:upload",
      handler: FileHandler.handleFileUpload,
      socketIds: [socket.id], // Only listen on this specific socket
    });
  }

  // 4. Monitoring & Maintenance (runs periodically)
  private async monitorConnections(): Promise<void> {
    setInterval(async () => {
      try {
        const metrics = await this.calculateMetrics();
        this.logMetrics(metrics);
        await this.cleanupZombieSockets(metrics);
        this.checkUserConnections(metrics);
        const sockets = await RedisManager.getAllFromGroup(
          "socketAuthenticatedUsers"
        );
        for (const socketData of sockets) {
          const socket = this.io.sockets.sockets.get(socketData.socketId);
          if (socket) {
            await this.checkTokenExpiration(socket);
          }
        }
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

  private async checkTokenExpiration(socket: Socket) {
    const socketData = (await RedisManager.getDataFromGroup(
      "socketAuthenticatedUsers",
      socket.id
    )) as SocketData;

    if (!socketData) return false;

    const now = Date.now();
    const lastActivity = socketData.lastRefreshedAt || socketData.connectedAt;
    const hoursSinceLastActivity = (now - lastActivity) / (60 * 60 * 1000);

    // If more than 24 hours since last activity for authenticated status
    // or more than 15 days for refreshed status
    const maxHours = socketData.status === "refreshed" ? 360 : 24; // 15 days or 1 day

    if (hoursSinceLastActivity > maxHours) {
      await this.handleConnectionError(socket, "Token expired");
      return false;
    }

    return true;
  }

  // 5. Public API Methods
  public getIO() {
    return this.io;
  }

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

  public async listenToEvent<T>({
    event,
    handler,
    room,
    socketIds,
  }: {
    event: string;
    handler: (data: T, socket: Socket) => Promise<void> | void;
    room?: string;
    socketIds?: string[];
  }): Promise<boolean> {
    try {
      // Get authenticated sockets from Redis
      const authenticatedSockets = await RedisManager.getAllFromGroup(
        "socketAuthenticatedUsers"
      );
      const connectedSockets = Array.from(this.io.sockets.sockets.values());

      // Filter sockets that are both authenticated and connected
      let targetSockets = connectedSockets.filter((socket) =>
        authenticatedSockets.some(
          (authSocket) => authSocket.socketId === socket.id
        )
      );

      // Apply additional filters if provided
      if (socketIds?.length) {
        targetSockets = targetSockets.filter((socket) =>
          socketIds.includes(socket.id)
        );
      } else if (room) {
        targetSockets = targetSockets.filter((socket) =>
          socket.rooms.has(room)
        );
      }

      // Attach event listener to each target socket
      targetSockets.forEach((socket) => {
        socket.on(event, async (data: T) => {
          try {
            await handler(data, socket);
          } catch (error) {
            console.error(`Error handling event ${event}:`, error);
            socket.emit("error", {
              event,
              message: "Error processing event",
            });
          }
        });
      });

      console.log(
        `Event listener '${event}' attached to ${targetSockets.length} sockets`
      );
      return true;
    } catch (error) {
      console.error(`Error setting up event listener for ${event}:`, error);
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
