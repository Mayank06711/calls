import Redis from "ioredis";

class RedisManager {
  private static redis: Redis | null = null; // if not made static then we can not use this.redis inside other static methods because this inside a static method refers to the class itself, not to an instance of the class which is case when redis is not declared static.

  // Method to initialize Redis connection
   public static initRedisConnection() {
    console.log(process.env.REDIS_HOST)
    this.redis = new Redis({
      host: process.env.REDIS_HOST!,
      port: +process.env.REDIS_PORT!,
      connectTimeout:10000,// 10 seconds timeout
    });

    this.redis.on("connect", () => {
      console.log("Connected to Redis server successfully.");
    });

    this.redis.on("error", (error) => {
      console.error("Error connecting to Redis server:", error);
    });

    this.redis.on("ready", () => {
      console.log("Redis server is ready to accept commands.");
    });

    this.redis.on("end", () => {
      console.log("Connection to Redis server has been closed.");
    });

    this.redis.on("reconnecting", () => {
      console.log("Attempting to reconnect to Redis server...");
    });

    console.log("Redis connection initiated.");
  }

  // Method to cache data in a hash
  public static async cacheDataInGroup<T>(
    group: string,
    key: string,
    data: T
  ): Promise<void> {
    if (!this.redis) {
      console.error("Redis is not initialized. Call `initRedisConnection()` first.");
      return;
    }

    try {
      // Add the data to a Redis hash
      const value = typeof data === "string" ? data : JSON.stringify(data);
      await this.redis.hset(group, key, value);// Adds new value To the key if it does not exist already otherwise it's just update that key value within that hash whose name is the group name

      // Adding  key (socketId) to the set for fast lookup/searching without scanning through all users in the hash(authenticatedUser)
      await this.redis.sadd(`${group}Set`, key);
      console.log(`Cached data in group ${group} for key: ${key}`);
    } catch (error) {
      console.error(`Error caching data for group ${group} and key: ${key}`, error);
    }
  }

  // Method to get cached data from a hash
  public static async getDataFromGroup<T>(group: string, key: string): Promise<T | null> {
    if (!this.redis) {
      console.error("Redis is not initialized. Call `initRedisConnection()` first.");
      return null;
    }

    try {
      const value = await this.redis.hget(group, key);
      if (value) {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      }
      return null;
    } catch (error) {
      console.error(`Error getting data for group ${group} and key: ${key}`, error);
      return null;
    }
  }

  // Method to remove data from a hash and set
  public static async removeDataFromGroup(group: string, key: string): Promise<void> {
    if (!this.redis) {
      console.error("Redis is not initialized. Call `initRedisConnection()` first.");
      return;
    }

    try {
      // Remove from hash
      await this.redis.hdel(group, key);
      
      // Remove from set
      await this.redis.srem(`${group}Set`, key);
      console.log(`Removed data from group ${group} for key: ${key}`);
    } catch (error) {
      console.error(`Error removing data from group ${group} and key: ${key}`, error);
    }
  }

  // Method to check if key exists in the set (fast lookup)
  public static async isKeyInGroup(group: string, key: string): Promise<boolean> {
    if (!this.redis) {
      console.error("Redis is not initialized. Call `initRedisConnection()` first.");
      return false;
    }

    try {
      const exists = await this.redis.sismember(`${group}Set`, key); // key is socket id this search in the set we have made with name authenticatedUserSet
      return exists === 1;
    } catch (error) {
      console.error(`Error checking key in group ${group}Set`, error);
      return false;
    }
  }

  public static getRedisInstance(): Redis | null {
    if (!this.redis) {
      console.error("Redis is not initialized. Call `initRedisConnection()` first.");
    }
    return this.redis;
  }
  
}




export {RedisManager};