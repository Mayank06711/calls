import { io, Socket } from "socket.io-client";

const SERVER_URL = "https://localhost:5005";

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
}

// Test scenarios
async function runTests() {
  console.log("Starting comprehensive socket tests...");

  // Create test users
  const createTestUser = (index: number): TestUser => ({
    userId: `test-user-${index}`,
    phoneNumber: `+1234567${index.toString().padStart(4, "0")}`,
    accessToken: `test-access-token-${index}`,
    refreshToken: `test-refresh-token-${index}`,
  });

  try {
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
    const singleUserAuth = await singleUser.authenticate();
    console.log("Single user authentication result:", singleUserAuth);

    if (!singleUserAuth) {
      throw new Error("Single user authentication failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
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
