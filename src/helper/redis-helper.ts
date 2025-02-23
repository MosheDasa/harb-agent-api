import { Redis, Pipeline } from "ioredis";
import { logError, logInfo } from "../utils/logger";
require("dotenv").config();

class RedisHelper {
  private static instance: RedisHelper;
  private redis: Redis;

  // Private constructor to prevent direct instantiation
  private constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT),
    });

    // Event listeners for Redis connection
    this.redis.on("connect", () => logInfo("✅ Connected to Redis"));
    this.redis.on("error", (err: any) => logError("❌ Redis error:", err));
  }

  // Singleton instance getter
  public static getInstance(): RedisHelper {
    if (!RedisHelper.instance) {
      RedisHelper.instance = new RedisHelper();
    }
    return RedisHelper.instance;
  }

  // Close Redis connection
  public async closeConnection(): Promise<void> {
    await this.redis.quit();
    logInfo(`🔒 Redis connection closed.`);
  }

  // -------------------------
  //        Key-Value Operations
  // -------------------------

  // Set a key with optional expiration time (in seconds)
  async set(
    key: string,
    value: string,
    expireInSeconds?: number
  ): Promise<boolean> {
    try {
      if (expireInSeconds) {
        await this.redis.set(key, value, "EX", expireInSeconds);
      } else {
        await this.redis.set(key, value);
      }
      return true;
    } catch (error) {
      logError(`❌ Failed to set key "${key}":`, { error });
      return false;
    }
  }

  // Get the value of a key
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      logError(`❌ Failed to get key "${key}":`, { error });
      return null;
    }
  }

  // Delete a key
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      logError(`❌ Failed to delete key "${key}":`, { error });
      return false;
    }
  }

  // Check if a key exists
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      logError(`❌ Failed to check existence of key "${key}":`, { error });
      return false;
    }
  }

  // -------------------------
  //        List Operations
  // -------------------------

  // Push a value to a list
  async pushToList(listName: string, value: string): Promise<number | null> {
    try {
      return await this.redis.lpush(listName, value);
    } catch (error) {
      logError(`❌ Failed to push to list "${listName}":`, { error });
      return null;
    }
  }

  // Get items from a list
  async getList(listName: string, start = 0, end = -1): Promise<string[]> {
    try {
      return await this.redis.lrange(listName, start, end);
    } catch (error) {
      logError(`❌ Failed to get list "${listName}`, { error });
      return [];
    }
  }

  // -------------------------
  //        Hash Operations
  // -------------------------

  // Set a field in a hash
  async setHash(
    hashName: string,
    key: string,
    value: string
  ): Promise<boolean> {
    try {
      await this.redis.hset(hashName, key, value);
      return true;
    } catch (error) {
      logError(`❌ Failed to set hash "${hashName}" key "${key}":`, { error });
      return false;
    }
  }

  // Get a field from a hash
  async getHash(hashName: string, key: string): Promise<string | null> {
    try {
      return await this.redis.hget(hashName, key);
    } catch (error) {
      logError(`❌ Failed to get hash "${hashName}" key "${key}":`, { error });
      return null;
    }
  }

  // -------------------------
  //        Pub/Sub Operations
  // -------------------------

  // Publish a message to a channel
  async publish(channel: string, message: string): Promise<boolean> {
    try {
      await this.redis.publish(channel, message);
      return true;
    } catch (error) {
      logError(`❌ Failed to publish message to channel "${channel}":`, {
        error,
      });
      return false;
    }
  }

  // Subscribe to a channel
  async subscribe(
    channel: string,
    callback: (message: string) => void
  ): Promise<void> {
    try {
      const subscriber = this.redis.duplicate();
      await subscriber.subscribe(channel);
      subscriber.on("message", (ch, message) => {
        if (ch === channel) {
          callback(message);
        }
      });

      logInfo(`📩 Subscribed to channel "${channel}"`);
    } catch (error) {
      logError(`❌ Failed to subscribe to channel "${channel}":`, { error });
    }
  }

  // -------------------------
  //        Advanced Operations
  // -------------------------

  // Execute multiple commands using pipeline
  //   async executePipeline(commands: [string, ...any[]][]): Promise<any[]> {
  //     const pipeline: Pipeline = this.redis.pipeline();
  //     commands.forEach((command) => pipeline[command[0]](...command.slice(1)));
  //     return await pipeline.exec();
  //   }

  // Flush all Redis keys
  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushall();
      return true;
    } catch (error) {
      logError(`❌ Failed to flush all Redis keys:`, { error });
      return false;
    }
  }
}

// -------------------------
// Singleton Instance Creation
// -------------------------
export const redisHelper = RedisHelper.getInstance();

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await redisHelper.closeConnection();
  process.exit(0);
});
