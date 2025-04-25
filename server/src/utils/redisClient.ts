import Redis from "ioredis";
class RedisManager {
  private static redis: Redis | null = null; // if not made static then we can not use this.redis inside other static methods because this inside a static method refers to the class itself, not to an instance of the class which is case when redis is not declared static.
  private static subscriber: Redis | null = null; // Separate instance for subscribing
  private static readonly LOCK_PREFIX = "lock:";
  private static readonly DEFAULT_CHANNELS = ["__keyevent@0__:expired"];
  private static readonly isDockerCompose = process.env.REDIS_HOST! === "redis";
  private static subscriberHandlers: Map<
    string,
    ((channel: string, message: string) => void)[]
  > = new Map();
  private static activeChannels: Set<string> = new Set();

  private static getRedisConfig() {
    const config = {
      host: process.env.REDIS_HOST!,
      port: parseInt(process.env.REDIS_PORT! || "6379"),
      username: this.isDockerCompose
        ? process.env.REDIS_USERNAME || "default"
        : undefined,
      password: this.isDockerCompose ? process.env.REDIS_PASSWORD : undefined,
      connectTimeout: 10000,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 2000);
        if (times > 10) {
          return null;
        }
        return delay;
      },
      showFriendlyErrorStack: true,
      // Add TLS options if needed
      // tls: process.env.NODE_ENV === 'production' ? {} : undefined
    };
    return config;
  }

  public static async initRedisConnection(additionalChannels: string[] = []) {
    // Initialize main Redis client
    try {
      if (this.redis) {
        console.log("Redis connection Already Exist");
        return;
      }
      // Only validate environment variables when running in Docker Compose
      if (this.isDockerCompose) {
        if (
          !process.env.REDIS_HOST ||
          !process.env.REDIS_PORT ||
          !process.env.REDIS_PASSWORD ||
          !process.env.REDIS_USERNAME
        ) {
          throw new Error("Missing required Redis environment variables");
        }
      }

      const redisConfig = RedisManager.getRedisConfig();

      // Initialize main Redis client
      this.redis = new Redis(redisConfig);

      // Wait for main Redis to be ready
      await new Promise<void>((resolve, reject) => {
        this.redis!.once("ready", () => {
          console.log("Redis Main Client Ready");
          resolve();
        });
        this.redis!.once("error", reject);
      });

      const pong = await this.redis.ping();
      console.log("Redis PING response:", pong);
      // Only authenticate if running in Docker Compose
      if (this.isDockerCompose) {
        try {
          await this.redis.auth(
            process.env.REDIS_USERNAME!,
            process.env.REDIS_PASSWORD!
          );
        } catch (authError) {
          console.error("Redis authentication failed:", authError);
          throw authError;
        }
      }

      // Initialize subscriber client
      this.subscriber = this.redis.duplicate({
        connectionName: "subscriber",
      });

      // Set up message handler before subscribing
      this.subscriber!.on("message", (channel, message) => {
        const handlers = this.subscriberHandlers.get(channel) || [];
        handlers.forEach((handler) => {
          try {
            console.log(message, channel);
            handler(channel, message);
          } catch (error) {
            console.error(`Handler error for channel ${channel}:`, error);
          }
        });
      });

      // Handle reconnection
      this.subscriber!.on("end", () => {
        console.log("Subscriber connection ended, will auto-reconnect...");
      });

      this.subscriber!.on("ready", async () => {
        console.log("Subscriber reconnected, resubscribing to channels...");
        // Resubscribe to all active channels
        if (this.activeChannels.size > 0) {
          console.log(this.activeChannels);
          await this.subscriber!.subscribe(...Array.from(this.activeChannels));
        }
      });

      // Wait for subscriber to be ready
      await new Promise<void>((resolve, reject) => {
        this.subscriber!.once("ready", resolve);
        this.subscriber!.once("error", reject);
      });

      // Enable keyspace notifications
      await this.redis!.config("SET", "notify-keyspace-events", "Ex");

      // Subscribe to initial channels
      const initialChannels = [...this.DEFAULT_CHANNELS, ...additionalChannels];
      if (initialChannels.length > 0) {
        await this.subscriber!.subscribe(...initialChannels);
        initialChannels.forEach((channel) => this.activeChannels.add(channel));
      }
      console.log("Redis connection initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Redis connection:", error);
      throw error; // Propagate error up
    }
  }

  // Add cleanup method
  public static async cleanup(): Promise<void> {
    try {
      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }
      console.log("Redis connections cleaned up");
    } catch (error) {
      console.error("Error cleaning up Redis connections:", error);
      throw error;
    }
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
  public static async addChannelHandler(
    channel: string,
    handler: (channel: string, message: string) => void
  ) {
    const handlers = this.subscriberHandlers.get(channel) || [];
    handlers.push(handler);
    this.subscriberHandlers.set(channel, handlers);

    // Subscribe to channel if this is the first handler
    if (handlers.length === 1 && !this.activeChannels.has(channel)) {
      await this.subscriber!.subscribe(channel);
      this.activeChannels.add(channel);
    }
  }

  // Method to cache data in a hash
  public static async cacheDataInGroup<T>(
    group: string,
    key: string,
    data: T,
    ttlInSeconds?: number, // Optional TTL parameter
    addToSet: boolean = false,
    setttlInSeconds?: number
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
      const setKey = `${group}Set`;

      // Use multi to ensure atomic operation
      const multi = this.redis.multi();

      // Store data in individual key
      multi.set(individualKey, value);

      // Add to set for lookup
      if (addToSet) {
        multi.sadd(setKey, key);
      }

      if (ttlInSeconds) {
        // Set TTL for both individual key and set
        multi.expire(individualKey, ttlInSeconds);
        console.log(`TTL of ${ttlInSeconds} seconds set for key: ${key}`);
      }
      if (setttlInSeconds) {
        multi.expire(setKey, setttlInSeconds);
        console.log(`TTL SET FOR SET ${setKey}`);
      }
      await multi.exec();
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

  public static async getAllFromGroup(
    group: string,
    useSet: boolean = false
  ): Promise<any[]> {
    if (!this.redis) {
      console.error("Redis is not initialized");
      return [];
    }

    try {
      let keys: string[];
      if (useSet) {
        // Get all keys from the set
        keys = await this.redis.smembers(`${group}Set`);
      } else {
        // Scan for keys matching the pattern if not using set
        const pattern = `${group}:*`;
        const stream = this.redis.scanStream({
          match: pattern,
          count: 100,
        });
        keys = [];
        for await (const resultKeys of stream) {
          keys.push(
            ...(resultKeys as string[]).map((key) =>
              key.replace(`${group}:`, "")
            )
          );
        }
      }

      // Get all values
      const values = await Promise.all(
        keys.map(async (key) => {
          const individualKey = `${group}:${key}`;
          const data = await this.redis!.get(individualKey);

          if (!data) {
            // Clean up set if key doesn't exist
            if (useSet) {
              await this.redis!.srem(`${group}Set`, key);
            }
            return null;
          }

          try {
            return { ...JSON.parse(data), key };
          } catch {
            return { data, key };
          }
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
    key: string,
    removeFromSet: boolean = false
  ): Promise<void> {
    if (!this.redis) {
      console.error("Redis is not initialized");
      return;
    }

    try {
      // Remove individual key
      const multi = this.redis.multi();

      // Remove individual key
      multi.del(`${group}:${key}`);
      // Only remove from set if requested
      if (removeFromSet) {
        multi.srem(`${group}Set`, key);
      }
      await multi.exec();
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

  static async acquireLock(
    lockKey: string,
    timeoutMs: number = 5000
  ): Promise<string | null> {
    if (!this.redis) {
      console.error(
        "Redis is not initialized. Call `initRedisConnection()` first."
      );
      return null;
    }
    try {
      // Generate unique identifier for this lock
      const lockId = `${Date.now()}-${Math.random()}`;
      const key = `${this.LOCK_PREFIX}${lockKey}`;

      // Method 1: Using multi command
      const result = await this.redis
        .multi()
        .set(key, lockId, "NX")
        .pexpire(key, timeoutMs)
        .exec();

      // If the SET was successful (first command in multi)
      return result?.[0]?.[1] === "OK" ? lockId : null;

      return result ? lockId : null;
    } catch (error) {
      console.error("Error acquiring lock:", error);
      return null;
    }
  }

  static async releaseLock(lockKey: string, lockId: string): Promise<boolean> {
    if (!this.redis) {
      console.error(
        "Redis is not initialized. Call `initRedisConnection()` first."
      );
      return false;
    }
    try {
      const key = `${this.LOCK_PREFIX}${lockKey}`;

      // Only release if we still own the lock
      const currentLockId = await this.redis!.get(key);
      if (currentLockId === lockId) {
        await this.redis!.del(key);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error releasing lock:", error);
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
