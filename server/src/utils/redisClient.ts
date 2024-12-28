import Redis from "ioredis";
class RedisManager {
  private static redis: Redis | null = null; // if not made static then we can not use this.redis inside other static methods because this inside a static method refers to the class itself, not to an instance of the class which is case when redis is not declared static.
  private static subscriber: Redis | null = null; // Separate instance for subscribing

  // Method to initialize Redis connection
  public static initRedisConnection() {
    console.log("Redis host", process.env.REDIS_HOST);
    this.redis = new Redis({
      host: process.env.REDIS_HOST!,
      port: +process.env.REDIS_PORT!,
      connectTimeout: 10000, // 10 seconds timeout
    });

    // Separate Redis instance for subscriber
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST!,
      port: +process.env.REDIS_PORT!,
      connectTimeout: 10000, // 10 seconds timeout
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

    this.subscriber.on("connect", () => {
      console.log("Subscriber Redis connected successfully.");
    });

    this.subscriber.on("end", () => {
      console.log("Connection to Redis subscriber server has been closed.");
    });

    this.subscriber.on("error", (error) => {
      console.error("Subscriber Redis connection error:", error);
    });
  }

  // Method to publish messages to a Redis channel
  public static async publishMessage(
    channel: string,
    message: string | object
  ): Promise<void> {
    if (!this.redis) {
      console.error(
        "Redis is not initialized. Call `initRedisConnection()` first."
      );
      return;
    }

    try {
      const messageString =
        typeof message === "string" ? message : JSON.stringify(message);
      await this.redis.publish(channel, messageString);
      console.log(`Message published to channel ${channel}: ${message}`);
    } catch (error) {
      console.error(`Error publishing message to channel ${channel}`, error);
    }
  }

  // Method to subscribe to a Redis channel and handle incoming messages
  public static async subscribeToChannel<T>(
    channel: string,
    messageHandler: (channel: string, message: string) => T | void
  ): Promise<void | T> {
    if (!this.subscriber) {
      console.error(
        "Subscriber Redis is not initialized. Call `initRedisConnection()` first."
      );
      return;
    }

    try {
      // Subscribe to the given channel
      await this.subscriber.subscribe(channel);
      console.log(`Subscribed to channel: ${channel}`);

      // Listen for messages on the subscribed channel
      return new Promise<void | T>((resolve) => {
        this.subscriber?.on("message", (receivedChannel, message) => {
          if (receivedChannel === channel) {
            console.log(`Message received on channel ${channel}: ${message}`);
            const result = messageHandler(receivedChannel, message);
            if (result !== undefined) {
              console.log(`Handler returned a result:`, result);
              resolve(result);
            } else {
              resolve(); // Return void if no result is provided
            }
          }
        });
      });
    } catch (error) {
      console.error(`Error subscribing to channel ${channel}`, error);
    }
  }

  // Method to cache data in a hash
  public static async cacheDataInGroup<T>(
    group: string,
    key: string,
    data: T,
    ttlInSeconds?: number // Optional TTL parameter
  ): Promise<void> {
    if (!this.redis) {
      console.error(
        "Redis is not initialized. Call `initRedisConnection()` first."
      );
      return;
    }

    try {
      const value = typeof data === "string" ? data : JSON.stringify(data);

      // Create individual key for this entry
      const individualKey = `${group}:${key}`;

      // Store data in individual key
      await this.redis.set(individualKey, value);

      // Add to set for lookup
      await this.redis.sadd(`${group}Set`, key);

      if (ttlInSeconds) {
        // Set TTL only for this specific entry
        await this.redis.expire(individualKey, ttlInSeconds);
        console.log(
          `TTL of ${ttlInSeconds} seconds set for key: ${key} in group: ${group}`
        );
      }
      console.log(`Cached data in group ${group} for key: ${key}`);
    } catch (error) {
      console.error(
        `Error caching data for group ${group} and key: ${key}`,
        error
      );
    }
  }

  public static async getDataFromGroup<T>(
    group: string,
    key: string
  ): Promise<T | null> {
    if (!this.redis) {
      console.error("Redis is not initialized");
      return null;
    }

    try {
      const value = await this.redis.get(`${group}:${key}`);
      if (value) {
        try {
          return JSON.parse(value) as T;
        } catch {
          return value as unknown as T;
        }
      }
      return null;
    } catch (error) {
      console.error(
        `Error getting data for group ${group} and key: ${key}`,
        error
      );
      return null;
    }
  }

  public static async getAllFromGroup(group: string): Promise<any[]> {
    if (!this.redis) {
      console.error("Redis is not initialized");
      return [];
    }

    try {
      // Get all keys from the set
      const keys = await this.redis.smembers(`${group}Set`);

      // Get all values and their TTLs
      const values = await Promise.all(
        keys.map(async (key) => {
          const individualKey = `${group}:${key}`;
          const data = await this.redis!.get(individualKey);

          // If key doesn't exist (expired), remove from set
          if (!data) {
            await this.redis!.srem(`${group}Set`, key);
            return null;
          }

          return data ? { ...JSON.parse(data), socketId: key } : null;
        })
      );

      return values.filter((v) => v !== null);
    } catch (error) {
      console.error(`Error getting all from group ${group}:`, error);
      return [];
    }
  }

  // Method to remove data from a hash and set
  public static async removeDataFromGroup(
    group: string,
    key: string
  ): Promise<void> {
    if (!this.redis) {
      console.error("Redis is not initialized");
      return;
    }

    try {
      // Remove individual key
      await this.redis.del(`${group}:${key}`);

      // Remove from set
      await this.redis.srem(`${group}Set`, key);

      console.log(`Removed data from group ${group} for key: ${key}`);
    } catch (error) {
      console.error(
        `Error removing data from group ${group} and key: ${key}`,
        error
      );
    }
  }

  // Method to check if key exists in the set (fast lookup)
  public static async isKeyInGroup(
    group: string,
    key: string
  ): Promise<boolean> {
    if (!this.redis) {
      console.error(
        "Redis is not initialized. Call `initRedisConnection()` first."
      );
      return false;
    }

    try {
      // First check if key exists in set
      const exists = await this.redis.sismember(`${group}Set`, key);

      if (exists === 1) {
        // Also verify the actual data exists
        const data = await this.redis.get(`${group}:${key}`);

        if (!data) {
          // If data doesn't exist but key is in set, clean up the set
          await this.redis.srem(`${group}Set`, key);
          return false;
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error checking key in group ${group}Set`, error);
      return false;
    }
  }
}

export { RedisManager };

/*
Why would you use REDIS_HOST?
Local Development: If you're running Redis locally, you would use localhost or 127.0.0.1 as REDIS_HOST to connect to Redis running on your machine.
Docker: In a Docker container, REDIS_HOST would usually be set to the name of the Redis container or a network alias when using Docker networks.
Remote Servers: In production or on cloud services like AWS, REDIS_HOST would point to the public IP of an EC2 instance or the internal IP of a server running Redis. In your case, it seems to be an external IP (43.205.129.144) or possibly a load balancer or proxy.
*/
