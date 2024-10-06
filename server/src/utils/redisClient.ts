import Redis from "ioredis";

class RedisManager {
  private redis: Redis | null = null;

  // Method to initialize Redis connection
  public initRedisConnection() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: +process.env.REDIS_PORT!,
    });

    // Listen for successful connection
    this.redis.on("connect", () => {
      console.log("Connected to Redis server successfully.");
    });

    // Listen for error events
    this.redis.on("error", (error) => {
      console.error("Error connecting to Redis server:", error);
    });

    // Optional: Listen for ready event (indicates that the connection is fully established)
    this.redis.on("ready", () => {
      console.log("Redis server is ready to accept commands.");
    });

    // Optional: Listen for end event (indicates that the connection has been closed)
    this.redis.on("end", () => {
      console.log("Connection to Redis server has been closed.");
    });

    // Optional: Listen for reconnecting event (indicates that the client is trying to reconnect)
    this.redis.on("reconnecting", () => {
      console.log("Attempting to reconnect to Redis server...");
    });

    console.log("Redis connection initiated.");
  }

  // Method to cache data
  public async cacheData<T>(key: string, data: T, expirationInSeconds: number): Promise<void> {
    if (!this.redis) {
      console.error("Redis is not initialized. Call `initRedisConnection()` first.");
      return;
    }

    try {
      // Convert data to JSON string if it's not a string
      const value = typeof data === "string" ? data : JSON.stringify(data);
      await this.redis.set(key, value, "EX", expirationInSeconds);
      console.log(`Cached data for key: ${key}`);
    } catch (error) {
      console.error(`Error caching data for key: ${key}`, error);
    }
  }

  // Method to get cached data
  public async getData<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      console.error("Redis is not initialized. Call `initRedisConnection()` first.");
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        // Try to parse JSON if it's not a string
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T; // Return as string if JSON parsing fails
        }
      }
      return null; // Return null if no value found
    } catch (error) {
      console.error(`Error getting data for key: ${key}`, error);
      return null;
    }
  }

  // Method to check Redis connection status
  public async checkRedisConnection():Promise<Boolean> {
    if (!this.redis) {
      console.error("Redis is not initialized. Call `initRedisConnection()` first.");
      return false;
    }

    try {
      await this.redis.ping(); // Sends a ping command to check if Redis is responding
      console.log("Redis is up and running.");
      return true;
    } catch (error) {
      console.error("Error checking Redis connection:", error);
      return false;
    }
  }
}

// Example usage
const redisManager = new RedisManager();
export default redisManager;
redisManager.initRedisConnection();
redisManager.checkRedisConnection(); // Check connection
