import { io, Socket } from "socket.io-client";
import * as fs from "fs";
import * as path from "path";
const SERVER_URL = "ws://localhost:5005";

interface TestUser {
  userId: string;
  phoneNumber: string;
  accessToken: string;
  refreshToken: string;
}

class SocketTester {
  private socket: Socket;
  private authenticated: boolean = false;
  private userData: TestUser;

  constructor(userData: TestUser) {
    this.userData = userData;
    this.socket = io(SERVER_URL, {
      reconnection: true,
      timeout: 10000,
      rejectUnauthorized: false,
      secure: true,
      autoConnect: false,
      query: {
        testMode: "true",
        userId: userData.userId,
        phoneNumber: userData.phoneNumber,
      },
    });

    this.setupEventListeners();
    this.socket.connect();
  }
  async authenticate(): Promise<boolean> {
    return new Promise((resolve) => {
      // Add timeout for authentication
      const timeout = setTimeout(() => {
        console.log(`Authentication timeout for user ${this.userData.userId}`);
        resolve(false);
      }, 5000);

      this.socket.emit(
        "authenticate",
        {
          accessToken: this.userData.accessToken,
          refreshToken: this.userData.refreshToken,
        },
        (response: { status: string; message: string; socketId: string }) => {
          clearTimeout(timeout);
          console.log(
            `Auth response for user ${this.userData.userId}:`,
            response
          );
          this.authenticated = response.status === "success";
          resolve(this.authenticated);
        }
      );
    });
  }
  isConnected(): boolean {
    return this.socket.connected;
  }
  isAuthenticated(): boolean {
    return this.authenticated;
  }
  private setupEventListeners(): void {
    this.socket.on("connect", () => {
      console.log(
        `Connected to server! Socket ID: ${this.socket.id}, User ID: ${this.userData.userId}`
      );
    });
    this.socket.on(
      "authenticate",
      (response: { status: string; message: string; socketId: string }) => {
        console.log(
          `Received authentication response for user ${this.userData.userId}:`,
          response
        );
        this.authenticated = response.status === "success";
      }
    );

    this.socket.on("connection_error", (error) => {
      console.error(
        `Connection error for user ${this.userData.userId}:`,
        error
      );
    });

    this.socket.on("disconnect", (reason) => {
      console.log(`Disconnected user ${this.userData.userId}:`, reason);
    });

    this.socket.on("forced_disconnect", (message) => {
      console.log(
        `Forced disconnect for user ${this.userData.userId}:`,
        message
      );
    });

    this.socket.on("auth_timeout", (message) => {
      console.log(
        `Authentication timeout for user ${this.userData.userId}:`,
        message
      );
    });
  }

  async getTotalSockets(): Promise<number> {
    return new Promise((resolve) => {
      this.socket.emit("total:sockets", (response: { total: number }) => {
        console.log("Total active sockets:", response.total);
        resolve(response.total);
      });
    });
  }

  disconnect(): void {
    this.socket.disconnect();
  }

  logout(): void {
    this.socket.emit("logout");
  }

  public waitForConnect(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.socket.connected) {
        resolve();
      } else {
        this.socket.once("connect", () => resolve());
      }
    });
  }

  public getSocketId(): string {
    return this.socket.id!;
  }


async uploadLocalImageToCloudinary(imagePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Read the file from assets folder
      const fullPath = path.join(__dirname, "assets", imagePath);
      const fileBuffer = fs.readFileSync(fullPath);
      const fileStats = fs.statSync(fullPath);
      
      // Get file extension and map to MIME type
      const extension = path.extname(imagePath).toLowerCase().slice(1);
      const mimeTypes: { [key: string]: string } = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        webp: "image/webp",
      };
      const fileType = mimeTypes[extension] || "application/octet-stream";

      // Prepare file data for both chat and avatar uploads
      const baseFileData = {
        file: fileBuffer,
        fileName: path.basename(imagePath),
        fileType,
        size: fileStats.size,
      };

      // Test both chat and avatar uploads
      const testUploads = [
        {
          ...baseFileData,
          type: "chat" as const,
          metadata: {
            chatId: "test-chat-123",
            messageId: "test-message-123",
          },
        },
        {
          ...baseFileData,
          type: "avatar" as const,
          metadata: {
            uploadType: "cloudinary",
            folder: "test-uploads/avatars",
          },
        },
      ];

      let completedUploads = 0;
      const errors: any[] = [];

      testUploads.forEach((fileData) => {
        // Listen for success response
        this.socket.once("file:upload:response", (response) => {
          console.log(`${fileData.type} upload response:`, response);
          completedUploads++;
          if (completedUploads === testUploads.length) {
            if (errors.length > 0) {
              reject(new Error(`Upload errors: ${JSON.stringify(errors)}`));
            } else {
              resolve();
            }
          }
        });

        // Listen for error
        this.socket.once("file:upload:error", (error) => {
          console.error(`${fileData.type} upload error:`, error);
          errors.push(error);
          completedUploads++;
          if (completedUploads === testUploads.length) {
            reject(new Error(`Upload errors: ${JSON.stringify(errors)}`));
          }
        });

        // For avatar uploads, also listen for specific events
        if (fileData.type === "avatar") {
          this.socket.once("file:upload:start", (data) => {
            console.log("Avatar upload started:", data);
          });

          this.socket.once("file:upload:success", (data) => {
            console.log("Avatar upload success:", data);
          });
        }

        // Emit file upload event
        this.socket.emit("file:upload", fileData);
      });
    } catch (error) {
      reject(error);
    }
  });
}
}
// Test scenarios
async function runTests() {
  console.log("Starting comprehensive socket tests...");

  // Create test users
  const createTestUser = (index: number): TestUser => ({
    userId: `67923ccce60274b96025e756`,
    phoneNumber: `+1234567${index.toString().padStart(4, "0")}`,
    accessToken: `test-access-token-${index}`,
    refreshToken: `test-refresh-token-${index}`,
  });

  try {
    console.log("\n🧪 Test 1.5: Authentication Timeout Test");
    const timeoutUser = new SocketTester(createTestUser(50));
    await timeoutUser.waitForConnect();

    // Don't authenticate immediately - wait for timeout
    console.log(
      "Waiting for authentication timeout (should take 30 seconds)..."
    );
    await new Promise((resolve) => setTimeout(resolve, 35000)); // Wait 35 seconds to ensure timeout occurs

    // Try to authenticate after timeout
    const timeoutAuthResult = await timeoutUser.authenticate();
    console.log("Authentication after timeout result:", timeoutAuthResult);

    if (!timeoutAuthResult) {
      throw new Error("Authentication should have failed after timeout");
    }
    // Test 1: Single user connection with timeout
    console.log("\n🧪 Test 1: Single user connection");
    const singleUser = new SocketTester(createTestUser(1));
    // Wait for connection with timeout
    const connectionTimeout = setTimeout(() => {
      throw new Error("Connection timeout for single user test");
    }, 5000);

    await singleUser.waitForConnect();

    clearTimeout(connectionTimeout);
    if (!singleUser.isConnected()) {
      throw new Error("Failed to connect single user");
    }

    // Add a delay of 1 minute before proceeding
    await new Promise((resolve) => setTimeout(resolve, 60000));

    const singleUserAuth = await singleUser.authenticate();
    console.log("Single user authentication result:", singleUserAuth);

    if (!singleUserAuth) {
      throw new Error("Single user authentication failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 4000));
    // Test 2: Multiple connections for same user (should handle MAX_CONNECTIONS_PER_USER)
    console.log("\n🧪 Test 2: Multiple connections for same user");
    const sameUserClients: SocketTester[] = [];
    const MAX_TEST_CONNECTIONS = 7; // Testing beyond limit of 5

    for (let i = 0; i < MAX_TEST_CONNECTIONS; i++) {
      const client = new SocketTester(createTestUser(1));
      await client.waitForConnect();
      const authenticated = await client.authenticate();
      sameUserClients.push(client);
      console.log(`Connection ${i + 1} authenticated:`, authenticated);
      // Small delay to ensure sequential connections
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Test 3: Concurrent user connections
    console.log("\n🧪 Test 3: Concurrent user connections");
    const CONCURRENT_USERS = 10;
    const concurrentClients = await Promise.all(
      Array(CONCURRENT_USERS)
        .fill(null)
        .map(async (_, index) => {
          const client = new SocketTester(createTestUser(index + 100));
          await client.waitForConnect();
          await client.authenticate();
          return client;
        })
    );

    // Test 4: Connection lock testing
    console.log("\n🧪 Test 4: Testing connection locks");
    const lockTestUser = createTestUser(999);
    const lockTestClients = await Promise.all(
      Array(3)
        .fill(null)
        .map(async () => {
          const client = new SocketTester(lockTestUser);
          await client.waitForConnect();
          return client;
        })
    );

     // Test 5: File Upload Tests
     console.log("\n🧪 Test 5: File Upload Tests");
     const uploadUser = new SocketTester(createTestUser(500));
     await uploadUser.waitForConnect();
     const uploadAuth = await uploadUser.authenticate();
     
     if (!uploadAuth) {
       throw new Error("Upload user authentication failed");
     }
 
     // Test different file types
     const testFiles = ["test.jpg", "test.png", "test.gif"];
     for (const file of testFiles) {
       console.log(`Testing upload of ${file}`);
       try {
         await uploadUser.uploadLocalImageToCloudinary(file);
         console.log(`✅ Successfully uploaded ${file}`);
       } catch (error) {
         console.error(`❌ Failed to upload ${file}:`, error);
       }
     }
      // Test invalid file
    console.log("\nTesting invalid file upload");
    try {
      await uploadUser.uploadLocalImageToCloudinary("invalid.txt");
      console.error("❌ Invalid file upload should have failed");
    } catch (error) {
      console.log("✅ Invalid file upload correctly rejected");
    }

    // Test concurrent uploads
    console.log("\nTesting concurrent uploads");
    try {
      await Promise.all([
        uploadUser.uploadLocalImageToCloudinary("test1.jpg"),
        uploadUser.uploadLocalImageToCloudinary("test2.jpg"),
        uploadUser.uploadLocalImageToCloudinary("test3.jpg"),
      ]);
      console.log("✅ Concurrent uploads successful");
    } catch (error) {
      console.error("❌ Concurrent uploads failed:", error);
    }

    // Test large file
    console.log("\nTesting large file upload");
    try {
      await uploadUser.uploadLocalImageToCloudinary("large.jpg"); // Assuming size > 3MB
      console.error("❌ Large file upload should have failed");
    } catch (error) {
      console.log("✅ Large file upload correctly rejected");
    }
 
    // Test 5: File Upload
    console.log("\n🧪 Test 6: Cloudinary Upload");
    try {
      await singleUser.uploadLocalImageToCloudinary("image.png");
      console.log("Cloudinary upload test passed");
    } catch (error) {
      console.error("Cloudinary upload test failed:", error);
    }

    // Attempt to authenticate all clients simultaneously
    const lockResults = await Promise.all(
      lockTestClients.map((client) => client.authenticate())
    );
    console.log("Lock test results:", lockResults);

    // Cleanup
    console.log("\n🧹 Cleaning up...");
    const allClients = [
      singleUser,
      ...sameUserClients,
      ...concurrentClients,
      ...lockTestClients,
    ];

    // Get final socket count
    const finalCount = await singleUser.getTotalSockets();
    console.log(`Final socket count: ${finalCount}`);

    // Disconnect all clients
    allClients.forEach((client) => client.disconnect());
  } catch (error) {
    console.error("Test suite error:", error);
  } finally {
    // Ensure cleanup happens even if tests fail
    process.exit(0);
  }
}

// Run the tests
console.log("🚀 Starting socket test suite");
runTests().catch(console.error);
