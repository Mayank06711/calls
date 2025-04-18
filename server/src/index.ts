import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "http"; // Import Server type
import fs from "fs";
import path from "path";
import { SocketManager } from "./socket";
import { RedisManager } from "./utils/redisClient";
import { Middleware } from "./middlewares/middlewares";
// importing Routes
import userRouter from "./routes/userRoutes";
import feedBackRouter from "./routes/feedbackRoutes";
import authRouter from "./routes/authRoutes";
import settingRoute from "./routes/settingRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import {
  connectDB,
  disconnectDB,
  configureCloudinary,
  checkHealth,
} from "./db";
import cronSchuduler from "./auto/cronJob";

class ServerManager {
  private app = express();
  private server!: HTTPServer; // Use the HTTPSServer type //! (definite assignment) operator to tell TypeScript that server will be assigned before it is used as it will not be assigned until start method is called
  private io!: SocketIOServer; // Socket.io instance
  private socketManager!: SocketManager;
  private static readonly CORS_OPTIONS = {
    origin: [
      "http://localhost:5173",
      `http://${process.env.AWS_PUBLIC_IP}:3000`,
      `https://${process.env.AWS_PUBLIC_IP}:3000`,
      "http://localhost:3000",
      "https://localhost:3000",
      "https://1e17-49-43-115-113.ngrok-free.app",
      "https://staging.d15sv24wr1qszx.amplifyapp.com"
    ],
    credentials: true, // Allows cookies and credentials to be sent with requests
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["Cache-Control", "ETag"],
  };
  constructor() {
    this.loadEnvironmentVariables();
    configureCloudinary();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeGracefulShutdown();
  }
  private loadEnvironmentVariables() {
    dotenv.config({
      path: ".env", // Path to your environment variables file
    });
  }

  // Initialize middlewares
  private initializeMiddlewares() {
    this.app.use(cors(ServerManager.CORS_OPTIONS));
    // this.app.set("trust proxy", 1);
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true, limit: "30kb" }));
    this.app.use(cookieParser());
    this.app.use(
      rateLimit({
        windowMs: 10 * 60 * 1000, // 15 minutes
        max: 1000, // limit each IP to 100 requests per windowMs
        message:
          "Too many requests from this IP, please try again later after 15 mins.",
      })
    );
    this.app.use(Middleware.platformDetector);
  }
  // initialize routes
  private initializeRoutes() {
    this.app.use("/api/v1/auth", authRouter);
    this.app.use("/api/v1/users", userRouter);
    this.app.use("/api/v1/settings", settingRoute);
    // this.app.use("/api/v1/admins", adminRouter);
    this.app.use("/api/v1/feedback", feedBackRouter);
    this.app.use("/api/v1/subscriptions", subscriptionRoutes);
    this.app.get(
      "/system/_status/health_check",
      async (req: Request, res: Response) => {
        try {
          const isHealthy = await checkHealth();

          if (isHealthy) {
            return res.status(200).json({
              status: "success",
              message: "All systems operational",
              timestamp: new Date().toISOString(),
              services: {
                server: "healthy",
                database: "connected",
              },
            });
          } else {
            return res.status(503).json({
              status: "error",
              message: "Service unavailable",
              timestamp: new Date().toISOString(),
              services: {
                server: "healthy",
                database: "disconnected",
              },
            });
          }
        } catch (error) {
          return res.status(500).json({
            status: "error",
            message: "Health check failed",
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    );
    this.app.get("/hello", (req: Request, res: Response) => {
      res.status(200).send("Hello Now my application is working!");
    });
  }

  private initializeErrorHandling() {
    this.app.use("*", (req, res) => {
      res.status(404).json({ message: "No such routes exists" });
    });
    this.app.use(Middleware.globalErrorHandler);
  }

  private initializeGracefulShutdown() {
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      // Send the error to our error handling middleware
      if (reason instanceof Error) {
        const mockReq = {} as Request;
        const mockRes = {} as Response;
        const mockNext = () => {};
        Middleware.globalErrorHandler(reason, mockReq, mockRes, mockNext);
      }
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      this.shutdownGracefully();
    });

    process.on("SIGTERM", this.shutdownGracefully.bind(this));
    process.on("SIGINT", this.shutdownGracefully.bind(this));
  }
  // Perform cleanup logic before shutdown
  private async shutdownGracefully() {
    try {
      console.log("Performing cleanup before shutdown...");
      if (this.socketManager) {
        await this.socketManager.cleanup();
      }
      await RedisManager.cleanup();
      // Flush logs
      this.flushLogs();
      // Close database connections (if applicable)
      await disconnectDB();
      await this.stopServer();

      console.log("Cleanup completed. Exiting application.");
      process.exit(0); // Exit with success code
    } catch (error) {
      console.error("Error during cleanup:", error);
      process.exit(1); // Exit with failure code
    }
  }

  // Flush logs (example: flush log buffer to disk)
  private flushLogs() {
    const logMessage = `${new Date().toISOString()} - Application shutdown initiated.\n\n`;
    const logFilePath = path.join(__dirname, "../logs", "shutdown.log");
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    fs.appendFileSync(logFilePath, logMessage);
    console.log("Logs flushed.");
  }
  public async start() {
    // Load SSL key and certificate
    const key = fs.readFileSync(
      path.join(__dirname, "../certs/cert.key"),
      "utf8"
    );
    const cert = fs.readFileSync(
      path.join(__dirname, "../certs/cert.crt"),
      "utf8"
    );
    //  HTTPS server with key and cert and for that createServer must be imported from https not http
    this.server = createServer(
      // {
      //   key: key,
      //   cert: cert,
      // },
      this.app
    );
    // Socket.io for real-time communication
    this.io = new SocketIOServer(this.server, {
      cors: ServerManager.CORS_OPTIONS,
    });
    const Port = process.env.PORT || 5005;
    try {
      await connectDB();
      await RedisManager.initRedisConnection();
      await new Promise<void>((resolve) => {
        this.server.listen(Port, () => {
          this.socketManager = SocketManager.getInstance(this.io);
          console.log(`Server is running on http://localhost:${Port}`);
          resolve();
        });
      }); 
    } catch (error) {
      console.error("Error during server initialization:", error);
      process.exit(1);
    }
  }

  private stopServer() {
    return new Promise<void>((resolve, reject) => {
      console.log("Stopping server...");
      this.server.close((err) => {
        if (err) {
          console.error("Error stopping server:", err);
          reject(err);
        } else {
          console.log("Server stopped.");
          resolve();
        }
      });
    });
  }
}

const serverManager = new ServerManager();
serverManager.start();
