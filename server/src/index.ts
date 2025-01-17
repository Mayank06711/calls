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
import { connectDB, configureCloudinary } from "./db";
import cronSchuduler from "./auto/cronJob";

class ServerManager {
  private app = express();
  private server!: HTTPServer; // Use the HTTPSServer type //! (definite assignment) operator to tell TypeScript that server will be assigned before it is used as it will not be assigned until start method is called
  private io!: SocketIOServer; // Socket.io instance
  private socketManager!: SocketManager;
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
    this.app.use(
      cors({
        origin: ["https://localhost:5173", "*"], // Allows requests from the frontend and any origin
        credentials: true, // Allows cookies and credentials to be sent with requests
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
      })
    );

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true, limit: "30kb" }));
    this.app.use(cookieParser());
    this.app.use(
      rateLimit({
        windowMs: 10 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
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
    // this.app.use("/api/v1/admins", adminRouter);
    this.app.use("/api/v1/feedback", feedBackRouter);
    this.app.get("/hello", (req: Request, res: Response) => {
      res.status(200).send("Hello Now my application is working!");
    });
  }

  private initializeErrorHandling() {
    this.app.use("*", (req, res) => {
      res.status(404).json({ message: "Page not found" });
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
      // Flush logs
      this.flushLogs();
      // Close database connections (if applicable)
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
      cors: {
        origin: [`https://localhost:5173`, "*"], // You can restrict this to your frontend URL for security
        methods: ["GET", "POST", "PUT"],
        credentials: true,
      },
    });
    const Port = process.env.PORT || 5005;
    try {
      await connectDB();
      await RedisManager.initRedisConnection();
      await new Promise<void>((resolve) => {
        this.server.listen(Port, () => {
          this.socketManager = SocketManager.getInstance(this.io);
          console.log(`Server is running on https://localhost:${Port}`);
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
