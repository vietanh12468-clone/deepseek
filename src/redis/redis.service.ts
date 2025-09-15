import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT) ?? 6379,
    });

    this.redis.on('connect', () => console.log('Connected to Redis'));
    this.redis.on('error', (err) => console.error('Redis error:', err));
  }

  async set(key: string, value: any, expireTime?: number): Promise<void> {
    if (expireTime) {
      await this.redis.set(key, JSON.stringify(value), 'EX', expireTime);
    } else {
      await this.redis.set(key, JSON.stringify(value));
    }
  }

  async get(key: string): Promise<any> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.redis.expire(key, seconds);
  }

  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  async hsetField(key: string, field: string, value: any): Promise<void> {
    await this.redis.hset(key, field, JSON.stringify(value));
  }

  async hsetObject(key: string, value: any): Promise<void> {
    // Convert object values to JSON strings before storing
    const stringifiedValue: Record<string, string> = {};

    for (const field in value) {
      stringifiedValue[field] = JSON.stringify(value[field]);
    }

    await this.redis.hset(key, stringifiedValue);
  }

  async hgetObject(key: string): Promise<any> {
    const data = await this.redis.hgetall(key);

    // Parse JSON strings back into objects
    for (const field in data) {
      try {
        data[field] = JSON.parse(data[field]);
      } catch (error) {
        console.log(error);

        // If parsing fails, keep the value as is (handles non-object fields)
      }
    }

    return data;
  }

  async hgetAll(pattern: string): Promise<any[]> {
    const keys = await this.redis.keys(pattern);

    // Retrieve all objects data from hash keys
    const objects = await Promise.all(
      keys.map(async (key) => {
        return this.redis.hgetall(key); // Fetch all fields in the hash
      }),
    );

    for (const object of objects) {
      for (const field in object) {
        try {
          object[field] = JSON.parse(object[field]);
        } catch (error) {
          console.log(error);
          // If parsing fails, keep the value as is (handles non-object fields)
        }
      }
    }

    return objects.filter((object) => Object.keys(object).length > 0); // Remove empty results
  }

  async hgetField(key: string, field: string): Promise<any> {
    const data = await this.redis.hget(key, field);
    return data ? JSON.parse(data) : null;
  }

  async deleteAllKeys(pattern: string): Promise<void> {
    const keys = await this.getAllKeys(pattern);
    if (keys.length === 0) return;

    const multi = this.redis.multi();
    keys.forEach((key) => {
      multi.del(key);
    });
    await multi.exec();
  }

  async getAllKeys(pattern: string): Promise<string[]> {
    return await this.redis.keys(pattern);
  }

  /**
   * Đặt giá trị dạng string cho key trong redis
   * @param key Key cần đặt
   * @param value Giá trị cần đặt (dạng string)
   * @param expireTime Thời gian hết hạn (giây), mặc định là không hết hạn
   */
  async setString(
    key: string,
    value: string,
    expireTime?: number,
  ): Promise<string> {
    if (expireTime) {
      return await this.redis.set(key, value, 'EX', expireTime);
    }
    return await this.redis.set(key, value);
  }

  /**
   * Lấy giá trị string từ redis bằng key
   * @param key Key cần lấy
   * @returns Giá trị dạng string của key
   */
  async getString(key: string): Promise<string> {
    return await this.redis.get(key);
  }
}
