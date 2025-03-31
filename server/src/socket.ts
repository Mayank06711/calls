import { Server as SocketServer, Socket } from "socket.io";
import { AuthServices } from "./helper/auth";
import { RedisManager } from "./utils/redisClient";
import {
  EmitOptions,
  FileUploadData,
  FileUploadResponse,
  PendingAuthData,
  SocketUserData,
  SocketData,
} from "./interface/interface";
import { FileHandler } from "./helper/fileHandler";
import User from "./controllers/userController";

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
  private authenticatedSocket: Socket | null = null;

  private readonly SOCKET_CONSTANTS = {
    REDIS: {
      GROUP: "socketAuthenticatedUsers",
      SET_OPERATIONS: {
        ADD_TO_SET: true,
        REMOVE_FROM_SET: true,
        USE_SET: true,
      },
      TTL: {
        SOCKET_DATA: 25 * 60 * 60, // 25 hours in seconds
        SET_DATA: 25 * 60 * 60, // 25 hours in seconds
      },
    },
    MAX_CONNECTIONS: {
      PER_USER: 5,
    },
    MONITOR: {
      GROUP: "monitor",
      KEY: "socket:monitor",
      INTERVAL: 2 * 60 * 60,
    },
    AUTH: {
      TIMEOUT: 60000, // 60 seconds
      MAX_TOKEN_AGE: {
        REFRESHED: 360, // 15 days in hours
        AUTHENTICATED: 24, // 1 day in hours
      },
      TOKEN_TYPE: {
        REFRESH: "refresh",
        ACCESS: "access",
      },
      GROUP: "auth:pending",
      STATUS: "pending",
    },
  } as const;

  /**
   * Private constructor ensures singleton pattern
   * Runs ONCE when first instance is created
   */
  private constructor(io: SocketServer) {
    this.io = io;
    this.setupAuthExpirationAndMonitoringHandler();
    this.initializeSocket();
  }

  private setupAuthExpirationAndMonitoringHandler(): void {
    // Debounce monitor execution to prevent multiple simultaneous runs
    let monitoringInProgress = false;
    let monitorRetryTimeout: NodeJS.Timeout | null = null;

    RedisManager.addChannelHandler(
      "__keyevent@0__:expired",
      async (channel, expiredKey) => {
        try {
          // Handle auth expirations immediately but don't block
          if (expiredKey.startsWith(`${this.SOCKET_CONSTANTS.AUTH.GROUP}:`)) {
            const socketId = expiredKey.replace(
              `${this.SOCKET_CONSTANTS.AUTH.GROUP}:`,
              ""
            );
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket && !socket.data?.authenticated) {
              // Don't await this
              this.handleConnectionError(socket, "Authentication timeout");
            }
          }

          // Handle monitor key expiration with debouncing
          if (
            expiredKey ===
            `${this.SOCKET_CONSTANTS.MONITOR.GROUP}:${this.SOCKET_CONSTANTS.MONITOR.KEY}`
          ) {
            if (monitoringInProgress) {
              console.log("Monitoring cycle already in progress, skipping...");
              return;
            }

            monitoringInProgress = true;
            try {
              // Clear any existing retry timeout
              if (monitorRetryTimeout) {
                clearTimeout(monitorRetryTimeout);
              }

              // Ensure monitor key is set first
              await this.resetMonitorKey();

              // Run the monitoring cycle
              await this.runMonitoringCycle();
            } catch (error) {
              console.error("Monitor cycle failed:", error);
              // Schedule a retry
              monitorRetryTimeout = setTimeout(() => {
                this.resetMonitorKey().catch((err) =>
                  console.error("Monitor key reset retry failed:", err)
                );
              }, 5000);
            } finally {
              monitoringInProgress = false;
            }
          }
        } catch (error) {
          console.error("Error in expiration handler:", error);
        }
      }
    );
    // Initial setup with backoff retry
    const setupMonitor = async (retryCount = 0, maxRetries = 3) => {
      try {
        if (monitoringInProgress) {
          console.log("Setup already in progress, waiting...");
          setTimeout(() => setupMonitor(retryCount), 1000);
          return;
        }

        monitoringInProgress = true;
        await this.resetMonitorKey();
        await this.runMonitoringCycle();
        console.log("Initial monitor setup successful");
      } catch (error) {
        console.error(`Monitor setup attempt ${retryCount + 1} failed:`, error);
        if (retryCount < maxRetries) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          setTimeout(() => setupMonitor(retryCount + 1), delay);
        } else {
          console.error("Monitor setup failed after max retries");
        }
      } finally {
        monitoringInProgress = false;
      }
    };

    setupMonitor();
  }

  private async resetMonitorKey(): Promise<void> {
    const key = `${this.SOCKET_CONSTANTS.MONITOR.GROUP}:${this.SOCKET_CONSTANTS.MONITOR.KEY}`;
    const now = Date.now();
    interface MonitorData {
      lastReset: number;
      nextReset: number;
      serverId: string;
    }

    try {
      // Check if key exists first
      const existing = await RedisManager.getDataFromGroup<MonitorData>(
        this.SOCKET_CONSTANTS.MONITOR.GROUP,
        this.SOCKET_CONSTANTS.MONITOR.KEY
      );
      // Only set new key if it doesn't exist or is close to expiring
      if (!existing || existing.nextReset - now < 30000) {
        await RedisManager.cacheDataInGroup<MonitorData>(
          this.SOCKET_CONSTANTS.MONITOR.GROUP,
          this.SOCKET_CONSTANTS.MONITOR.KEY,
          {
            lastReset: now,
            nextReset: now + this.SOCKET_CONSTANTS.MONITOR.INTERVAL * 1000,
            serverId: process.env.SERVER_ID || "default",
          },
          this.SOCKET_CONSTANTS.MONITOR.INTERVAL
        );

        console.log(`Monitor key ${key} set/updated`);
      }
    } catch (error) {
      console.error(`Error resetting monitor key ${key}:`, error);
      throw error; // Now properly throwing the caught error
    }
    console.log(
      `Monitor key ${key} set with TTL of ${this.SOCKET_CONSTANTS.MONITOR.INTERVAL} seconds`
    );
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
        process.env.NODE_ENV === "dev" &&
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
        socket.data.authenticated = true; // Add this line
        socket.data.userId = testUserData.userId; // Add this line

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

      await RedisManager.cacheDataInGroup<PendingAuthData>(
        this.SOCKET_CONSTANTS.AUTH.GROUP,
        socket.id,
        {
          startTime: Date.now(),
          serverId: process.env.SERVER_ID || "default",
          status: this.SOCKET_CONSTANTS.AUTH.STATUS, // pending
        },
        this.SOCKET_CONSTANTS.AUTH.TIMEOUT / 1000
      );

      let lockId: string | null = null;
      let userData: any = null;

      socket.on(
        "authenticate",
        async (
          authData: { refreshToken?: string; accessToken?: string },
          callback
        ) => {
          try {
            await RedisManager.removeDataFromGroup(
              this.SOCKET_CONSTANTS.AUTH.GROUP,
              socket.id
            );
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
            await RedisManager.removeDataFromGroup(
              this.SOCKET_CONSTANTS.AUTH.GROUP,
              socket.id
            );
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
          this.SOCKET_CONSTANTS.AUTH.TOKEN_TYPE.ACCESS
        );
        if (userData) {
          return userData;
        }
      }

      if (authData.refreshToken) {
        // If access token fails or isn't present, try refresh token
        userData = await AuthServices.verifyJWT_Token(
          authData.refreshToken,
          this.SOCKET_CONSTANTS.AUTH.TOKEN_TYPE.REFRESH
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
      this.SOCKET_CONSTANTS.REDIS.GROUP,
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
      this.SOCKET_CONSTANTS.REDIS.GROUP,
      socket.id,
      {
        userId: userData.userId,
        mobNum: userData.mobNum,
        socketId: socket.id,
        connectedAt: Date.now(),
        lastRefreshedAt: Date.now(),
        status: userData.status,
      },
      this.SOCKET_CONSTANTS.REDIS.TTL.SOCKET_DATA,
      this.SOCKET_CONSTANTS.REDIS.SET_OPERATIONS.ADD_TO_SET,
      this.SOCKET_CONSTANTS.REDIS.TTL.SET_DATA
    );
    console.log("Stored new socket data", socket.id);
  }

  private async handleRefreshedSocket(socket: Socket, userData: any) {
    const socketData = (await RedisManager.getDataFromGroup(
      this.SOCKET_CONSTANTS.REDIS.GROUP,
      socket.id
    )) as SocketData;

    await RedisManager.cacheDataInGroup(
      this.SOCKET_CONSTANTS.REDIS.GROUP,
      socket.id,
      {
        ...socketData,
        lastRefreshedAt: Date.now(),
        status: "refreshed",
        userId: userData.userId, // Ensure we update with latest data
        mobNum: userData.mobNum,
      },
      this.SOCKET_CONSTANTS.REDIS.TTL.SOCKET_DATA,
      this.SOCKET_CONSTANTS.REDIS.SET_OPERATIONS.ADD_TO_SET,
      this.SOCKET_CONSTANTS.REDIS.TTL.SET_DATA
    );
    console.log("Updated existing socket data", socket.id);
  }

  private async handleReplacementSocket(socket: Socket, userData: any) {
    await RedisManager.removeDataFromGroup(
      this.SOCKET_CONSTANTS.REDIS.GROUP,
      socket.id,
      this.SOCKET_CONSTANTS.REDIS.SET_OPERATIONS.REMOVE_FROM_SET
    );
    await this.handleNewSocket(socket, userData);
    console.log("Replaced existing socket data", socket.id);
  }

  private async handleExistingConnections(userId: string): Promise<void> {
    const sockets = await this.getAuthenticatedSockets();
    const userSockets = sockets.filter((socket) => socket.userId === userId);

    if (userSockets.length >= this.SOCKET_CONSTANTS.MAX_CONNECTIONS.PER_USER) {
      userSockets.sort((a, b) => b.connectedAt - a.connectedAt);

      // Disconnect oldest connections
      const socketsToRemove = userSockets.slice(
        this.SOCKET_CONSTANTS.MAX_CONNECTIONS.PER_USER - 1
      );
      await Promise.all(
        socketsToRemove.map((socketData) =>
          this.removeSocket(socketData.key, "Too many connections")
        )
      );
    }
  }

  private handleConnectionError(socket: Socket, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.removeSocket(socket.id, errorMessage, "connection_error", true);
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
        const authenticatedSockets = await this.getAuthenticatedSockets();
        callback({ total: authenticatedSockets.length });
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
          this.SOCKET_CONSTANTS.AUTH.GROUP,
          socket.id
        );
        await this.removeSocket(
          socket.id,
          "User disconnected",
          "disconnect",
          false // Don't emit on disconnect as it's already disconnected
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
        await this.removeSocket(
          socket.id,
          "User logged out",
          "logout",
          true // Emit before disconnecting
        );
      } catch (error) {
        console.error("Error handling logout:", error);
      }
    });
    this.listenToEvent({
      event: "file:upload",
      handler: async (data: FileUploadData, socket: Socket) => {
        try {
          const userId = socket.data.userId;
          if (!userId) {
            socket.emit("file:upload:error", {
              status: "error",
              message: "User not authenticated",
            });
            return;
          }
          if (data.type === "avatar") {
            const emitter = {
              start: (data: any) => socket.emit("file:upload:start", data),
              success: (data: any) => socket.emit("file:upload:success", data),
              error: (data: any) => socket.emit("file:upload:error", data),
              broadcast: (data: any) =>
                socket.broadcast
                  .to(`user:${userId}`)
                  .emit("avatar:updated", data),
            };

            await User.handleAvatarUploadEvent(data, userId, emitter);
          } else {
            // Handle chat file uploads
            await FileHandler.handleFileUpload({
              data,
              userId,
              callback: (response) =>
                socket.emit("file:upload:response", response),
            });
          }
        } catch (error) {
          console.error("Error handling file upload:", error);
          socket.emit("file:upload:error", {
            status: "error",
            message: "File upload failed",
            metadata: {
              error: error instanceof Error ? error.message : "Unknown error",
            },
          });
        }
      },
      socketIds: [socket.id],
    });
  }

  // 4. Monitoring & Maintenance (runs periodically)
  private async getAuthenticatedSockets(): Promise<SocketData[]> {
    try {
      const sockets = await RedisManager.getAllFromGroup(
        this.SOCKET_CONSTANTS.REDIS.GROUP,
        this.SOCKET_CONSTANTS.REDIS.SET_OPERATIONS.USE_SET
      );
      const connectedSockets = await this.io.sockets.sockets.keys();
      const connectedSocketsSet = new Set(connectedSockets);

      // Filter and validate socket data
      return sockets
        .filter((socket): socket is SocketData => {
          // Type guard to ensure socket data is valid
          if (!socket || typeof socket !== "object") {
            console.warn("Invalid socket data:", socket);
            return false;
          }

          if (!socket.key || !socket.userId || !socket.connectedAt) {
            console.warn("Missing required socket properties:", socket);
            return false;
          }

          // Check if socket is still connected
          if (!connectedSocketsSet.has(socket.key)) {
            return false;
          }

          return true;
        })
        .map((socket) => ({
          ...socket,
          // Ensure all required properties have proper types
          connectedAt: Number(socket.connectedAt),
          lastRefreshedAt: socket.lastRefreshedAt
            ? Number(socket.lastRefreshedAt)
            : undefined,
          status: socket.status || "authenticated",
        }));
    } catch (error) {
      console.error("Error getting authenticated sockets:", error);
      if (process.env.NODE_ENV === "dev") {
        console.debug("Error details:", {
          name: error instanceof Error ? error.name : "Unknown",
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
      return [];
    }
  }

  private async removeSocket(
    socketId: string,
    reason?: string,
    eventName: string = "forced_disconnect",
    emit: boolean = false
  ): Promise<void> {
    try {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        if (reason && emit) {
          socket.emit(eventName, reason);
        }
        socket.disconnect(true);
      }
      await RedisManager.removeDataFromGroup(
        this.SOCKET_CONSTANTS.REDIS.GROUP,
        socketId,
        this.SOCKET_CONSTANTS.REDIS.SET_OPERATIONS.REMOVE_FROM_SET
      );
    } catch (error) {
      console.error(`Error removing socket ${socketId}:`, error);
    }
  }

  private async runMonitoringCycle(): Promise<void> {
    try {
      const metrics = await this.calculateMetrics();
      if (metrics.totalStoredSockets > 0) {
        this.logMetrics(metrics);
        await this.cleanupZombieSockets(metrics);
        await this.checkUserConnections(metrics);
      }

      const sockets = await this.getAuthenticatedSockets();
      for (const socketData of sockets) {
        const socket = this.io.sockets.sockets.get(socketData.key);
        if (socket) {
          await this.checkTokenExpiration(socket);
        }
      }
    } catch (error) {
      console.error("Error in monitoring cycle:", error);
    }
  }

  private async calculateMetrics() {
    const sockets = await this.getAuthenticatedSockets();
    const connectedSockets = await this.io.sockets.sockets.keys();
    const connectedSocketsSet = new Set(connectedSockets);
    const activeSockets = sockets.filter((socket) =>
      connectedSocketsSet.has(socket.key)
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
      if (connectedSocketsSet.has(socket.key)) {
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
      const sockets = await this.getAuthenticatedSockets();
      const connectedSockets = await this.io.sockets.sockets.keys();
      const connectedSocketsSet = new Set(connectedSockets);

      const zombieSockets = sockets.filter(
        (socket) => !connectedSocketsSet.has(socket.key)
      );
      await Promise.all(
        zombieSockets.map((socket) =>
          this.removeSocket(socket.key, "Zombie socket cleanup")
        )
      );
    }
  }

  private checkUserConnections(metrics: any) {
    for (const [userId, data] of metrics.usersMap) {
      if (data.activeCount > this.SOCKET_CONSTANTS.MAX_CONNECTIONS.PER_USER) {
        console.warn(
          `User ${userId} has ${data.activeCount} active connections!`
        );
      }
    }
  }

  private async checkTokenExpiration(socket: Socket) {
    const socketData = (await RedisManager.getDataFromGroup(
      this.SOCKET_CONSTANTS.REDIS.GROUP,
      socket.id
    )) as SocketData;

    if (!socketData) return false;

    const now = Date.now();
    const lastActivity = socketData.lastRefreshedAt || socketData.connectedAt;
    const hoursSinceLastActivity = (now - lastActivity) / (60 * 60 * 1000);

    // If socket is still active (has events in last hour), update lastRefreshedAt
    if (socket.connected && hoursSinceLastActivity < 1) {
      await RedisManager.cacheDataInGroup(
        this.SOCKET_CONSTANTS.REDIS.GROUP,
        socket.id,
        {
          ...socketData,
          lastRefreshedAt: now,
        },
        this.SOCKET_CONSTANTS.REDIS.TTL.SOCKET_DATA
      );
      return true;
    }
    // If more than 24 hours since last activity for authenticated status
    // or more than 15 days for refreshed status
    const maxHours =
      socketData.status === "refreshed"
        ? this.SOCKET_CONSTANTS.AUTH.MAX_TOKEN_AGE.REFRESHED
        : this.SOCKET_CONSTANTS.AUTH.MAX_TOKEN_AGE.AUTHENTICATED; // 15 days or 1 day

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
      const sockets = await this.getAuthenticatedSockets();

      return sockets
        .map((socket) => ({
          socketId: socket.key,
          userId: socket.userId,
          mobNum: socket.mobNum,
          connectedAt: new Date(socket.connectedAt).toISOString(),
          lastRefreshedAt: socket.lastRefreshedAt
            ? new Date(socket.lastRefreshedAt).toISOString()
            : undefined,
          hoursRemaining: Number(
            (
              (this.SOCKET_CONSTANTS.AUTH.MAX_TOKEN_AGE.AUTHENTICATED *
                60 *
                60 *
                1000 -
                (Date.now() - (socket.lastRefreshedAt || socket.connectedAt))) /
              (60 * 60 * 1000)
            ).toFixed(2)
          ),
          status: socket.status,
          isActive: true, // Since getAuthenticatedSockets only returns active sockets
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
      const activeSockets = await this.getAuthenticatedSockets();
      const activeUsers = new Set(activeSockets.map((socket) => socket.userId));
      return activeUsers.size;
    } catch (error) {
      console.error("Error getting active user count:", error);
      return 0;
    }
  }

  public async disconnectUser(userId: string): Promise<number> {
    try {
      const sockets = await this.getAuthenticatedSockets();
      const userSockets = sockets.filter((socket) => socket.userId === userId);

      await Promise.all(
        userSockets.map((socketData) =>
          this.removeSocket(socketData.key, "User disconnected by system")
        )
      );

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

      if (targetSocketIds?.length) {
        const authenticatedSockets = await this.getAuthenticatedSockets();
        const validSocketIds = new Set(authenticatedSockets.map((s) => s.key));

        const filteredSocketIds = targetSocketIds.filter((id) =>
          validSocketIds.has(id)
        );
        await Promise.all(
          filteredSocketIds.map((socketId) => {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket) {
              socket.emit(event, payload);
            }
          })
        );
        console.log(
          `Event ${event} emitted to specific sockets:`,
          filteredSocketIds
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
      const authenticatedSockets = await this.getAuthenticatedSockets();
      let targetSockets = Array.from(this.io.sockets.sockets.values()).filter(
        (socket) =>
          authenticatedSockets.some(
            (authSocket) => authSocket.key === socket.id
          )
      );

      if (socketIds?.length) {
        targetSockets = targetSockets.filter((socket) =>
          socketIds.includes(socket.id)
        );
      } else if (room) {
        targetSockets = targetSockets.filter((socket) =>
          socket.rooms.has(room)
        );
      }

      targetSockets.forEach((socket) => {
        socket.on(event, async (data: T) => {
          try {
            await handler(data, socket);
          } catch (error) {
            console.error(`Error handling event ${event}:`, error);
            socket.emit("error", { event, message: "Error processing event" });
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
      const sockets = await this.getAuthenticatedSockets();
      await Promise.all(
        sockets.map((socketData) =>
          this.removeSocket(socketData.key, "Server is shutting down")
        )
      );
      this.io.disconnectSockets(true);
      console.log("Socket cleanup completed");
    } catch (error) {
      console.error("Error during socket cleanup:", error);
      throw error;
    }
  }

  public getAuthenticatedSocket(): Socket | null {
    return this.authenticatedSocket?.connected
      ? this.authenticatedSocket
      : null;
  }
}

export { SocketManager };
