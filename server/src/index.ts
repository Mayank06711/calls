import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPSServer } from "https"; // Import Server type
import fs from "fs";
import path from "path";
import SocketManager from "./socket";

import {RedisManager} from "./utils/redisClient";
import { Middleware } from "./middlewares/middlewares";
// importing Routes
import userRouter from "./routes/userRoutes";
import feedBackRouter from "./routes/feedbackRoutes"; 
import { connectDB } from "./db";
import cronSchuduler from "./auto/cronJob";

class ServerManager {
  private app = express();
  private server!: HTTPSServer; // Use the HTTPSServer type //! (definite assignment) operator to tell TypeScript that server will be assigned before it is used as it will not be assigned until start method is called
  private io!: SocketIOServer; // Socket.io instance
  constructor() {
    this.loadEnvironmentVariables();
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
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message:
          "Too many requests from this IP, please try again later after 15 mins.",
      })
    );
  }
  // initialize routes
  private initializeRoutes() {
    this.app.use("/api/v1/users", userRouter);
    // this.app.use("/api/v1/admins", adminRouter);
    this.app.use("/api/v1/feedback",feedBackRouter)
    this.app.get("/", (req: Request, res: Response) => {
      res.status(201).send("Hello Now my application is working!");
    });
  }

  private initializeErrorHandling() {
    this.app.use(Middleware.ErrorMiddleware);
    this.app.use("*", (req, res) => {
      res.status(404).json({ message: "Page not found" });
    });
  }

  private initializeGracefulShutdown() {
    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
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
    //  HTTPS server with key and cert
    this.server = createServer(
      {
        key: key,
        cert: cert,
      },
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

    await connectDB()
      .then(() => {
        this.server.listen(Port, () => {
          SocketManager(this.io);
          RedisManager.initRedisConnection(); // if we do not invoke this funtion here, and do all things in redis file only that file will have to be executed separately as we have only running our main script which handles all things.
          //  cronSchuduler("* */2 * * *");
          console.log(`Server is running on https://localhost:${Port}`);
        });
      })
      .catch((err) => {
        console.error("Error connecting to MongoDB:", err);
        process.exit(1); // Exit with failure code
      });
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
