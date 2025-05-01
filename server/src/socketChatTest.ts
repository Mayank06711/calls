import { io, Socket } from "socket.io-client";
const SERVER_URL = "ws://localhost:5005";

interface TestUser {
  userId: string;
  phoneNumber: string;
  accessToken: string;
  refreshToken: string;
}

interface ChatMessage {
  chatId: string;
  message: {
    messageId: number;
    text: string;
    sender: string;
    messageType: string;
    createdAt: Date;
    status: {
      isRead: boolean;
      readAt?: Date;
      deliveredAt?: Date;
    };
  };
  sender?: {
    id: string;
  };
  status?: string;
}

class SocketChatTester {
  private socket: Socket;
  private authenticated: boolean = false;
  // Change private to protected or add getter method
  protected userData: TestUser;
  private receivedMessages: ChatMessage[] = [];

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

  // Add getter method for userData
  public getUserData(): TestUser {
    return this.userData;
  }

  // Rest of the methods remain the same...
  private setupEventListeners(): void {
    this.socket.on("connect", () => {
      console.log(
        `Connected: Socket ID ${this.socket.id}, User ID ${this.userData.userId}`
      );
    });

    this.socket.on("disconnect", (reason) => {
      console.log(
        `Disconnected: User ${this.userData.userId}, Reason: ${reason}`
      );
    });

    this.socket.on("chat:new:message", (message: ChatMessage) => {
      console.log(`New message received by ${this.userData.userId}:`, message);
      this.receivedMessages.push(message);
    });
  }

  async authenticate(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log(`Authentication timeout: ${this.userData.userId}`);
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
          this.authenticated = response.status === "success";
          console.log(
            `Authentication ${
              this.authenticated ? "successful" : "failed"
            } for ${this.userData.userId}`
          );
          resolve(this.authenticated);
        }
      );
    });
  }

  async sendMessage(
    receiverId: string,
    text: string
  ): Promise<ChatMessage | null> {
    return new Promise((resolve) => {
      if (!this.authenticated) {
        console.error("Cannot send message: User not authenticated");
        resolve(null);
        return;
      }

      this.socket.emit("chat:send:message", {
        receiverId,
        text,
        messageType: "text",
      });

      this.socket.once("chat:message:sent", (response: ChatMessage) => {
        console.log(`Message sent by ${this.userData.userId}:`, response);
        resolve(response);
      });

      this.socket.once("chat:message:error", (error) => {
        console.error(`Message error for ${this.userData.userId}:`, error);
        resolve(null);
      });

      setTimeout(() => {
        console.log("Message send timeout");
        resolve(null);
      }, 5000);
    });
  }

  getReceivedMessages(): ChatMessage[] {
    return this.receivedMessages;
  }

  clearReceivedMessages(): void {
    this.receivedMessages = [];
  }

  isConnected(): boolean {
    return this.socket.connected;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  disconnect(): void {
    this.socket.disconnect();
  }
}

// Test runner
async function runChatTests() {
  console.log("Starting Chat Tests...");

  const userA = new SocketChatTester({
    userId: "67923ccce60274b96025e756",
    phoneNumber: "+1234567890",
    accessToken: "test-access-token-A",
    refreshToken: "test-refresh-token-A",
  });

  const userB = new SocketChatTester({
    userId: "67923ccce60274b96025e757",
    phoneNumber: "+1234567891",
    accessToken: "test-access-token-B",
    refreshToken: "test-refresh-token-B",
  });

  try {
    console.log("\n🧪 Test 1: Authentication");
    const authResultA = await userA.authenticate();
    const authResultB = await userB.authenticate();

    if (!authResultA || !authResultB) {
      throw new Error("Authentication failed");
    }
    console.log("✅ Authentication successful for both users");

    console.log("\n🧪 Test 2: Message Sending");
    const testMessage = "Hello, this is a test message!";
    // Use getter method instead of accessing userData directly
    const messageResult = await userA.sendMessage(
      userB.getUserData().userId,
      testMessage
    );

    if (!messageResult) {
      throw new Error("Message sending failed");
    }
    console.log("✅ Message sent successfully");

    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("\n🧪 Test 3: Message Reception");
    const receivedMessages = userB.getReceivedMessages();

    if (receivedMessages.length === 0) {
      throw new Error("Message not received by User B");
    }

    if (receivedMessages[0].message.text === testMessage) {
      console.log("✅ Message received correctly by User B");
    } else {
      throw new Error("Received message content doesn't match");
    }

    console.log("\n🧪 Test 4: Message Privacy");
    const userC = new SocketChatTester({
      userId: "67923ccce60274b96025e758",
      phoneNumber: "+1234567892",
      accessToken: "test-access-token-C",
      refreshToken: "test-refresh-token-C",
    });

    await userC.authenticate();
    // Use getter method here too
    await userA.sendMessage(
      userB.getUserData().userId,
      "This should not reach User C"
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const userCMessages = userC.getReceivedMessages();
    if (userCMessages.length === 0) {
      console.log(
        "✅ Message privacy maintained (User C received no messages)"
      );
    } else {
      throw new Error(
        "Privacy breach: User C received messages not intended for them"
      );
    }
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    console.log("\n🧹 Cleaning up...");
    userA.disconnect();
    userB.disconnect();
    process.exit(0);
  }
}

console.log("🚀 Starting Chat Test Suite");
runChatTests().catch(console.error);

export { SocketChatTester };
