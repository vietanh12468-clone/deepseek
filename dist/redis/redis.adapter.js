"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisAdapter = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let RedisAdapter = class RedisAdapter {
    constructor() {
        this.client = new ioredis_1.default({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT) ?? 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: parseInt(process.env.REDIS_DB) ?? 0,
        });
        this.client.on('connect', () => console.log('Redis Adapter connected'));
        this.client.on('error', (err) => console.error('Redis Adapter error:', err));
    }
    async get(key) {
        return this.client.get(key);
    }
    async getJson(key) {
        const value = await this.client.get(key);
        if (!value)
            return null;
        try {
            return JSON.parse(value);
        }
        catch (error) {
            console.error('Error parsing JSON from Redis:', error);
            return null;
        }
    }
    async set(key, value, expireTime) {
        if (expireTime) {
            return this.client.set(key, value, 'EX', expireTime);
        }
        return this.client.set(key, value);
    }
    async setJson(key, value, expireTime) {
        const jsonValue = JSON.stringify(value);
        return this.set(key, jsonValue, expireTime);
    }
    async del(...keys) {
        return this.client.del(...keys);
    }
    async hget(key, field) {
        return this.client.hget(key, field);
    }
    async hgetall(key) {
        return this.client.hgetall(key);
    }
    async hset(key, field, value) {
        return this.client.hset(key, field, value);
    }
    async hmset(key, hash) {
        return this.client.hmset(key, hash);
    }
    async hdel(key, ...fields) {
        return this.client.hdel(key, ...fields);
    }
    async lpush(key, ...values) {
        return this.client.lpush(key, ...values);
    }
    async rpush(key, ...values) {
        return this.client.rpush(key, ...values);
    }
    async lpop(key) {
        return this.client.lpop(key);
    }
    async rpop(key) {
        return this.client.rpop(key);
    }
    async lrange(key, start, stop) {
        return this.client.lrange(key, start, stop);
    }
    async sadd(key, ...members) {
        return this.client.sadd(key, ...members);
    }
    async smembers(key) {
        return this.client.smembers(key);
    }
    async srem(key, ...members) {
        return this.client.srem(key, ...members);
    }
    async exists(key) {
        return this.client.exists(key);
    }
    async expire(key, seconds) {
        return this.client.expire(key, seconds);
    }
    async ttl(key) {
        return this.client.ttl(key);
    }
    async publish(channel, message) {
        return this.client.publish(channel, message);
    }
    async subscribe(channel, callback) {
        const subscriber = this.client.duplicate();
        await subscriber.subscribe(channel);
        subscriber.on('message', (_channel, message) => {
            if (channel === _channel) {
                callback(message);
            }
        });
    }
    async transaction() {
        return this.client.multi();
    }
    async close() {
        await this.client.quit();
    }
};
exports.RedisAdapter = RedisAdapter;
exports.RedisAdapter = RedisAdapter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisAdapter);
//# sourceMappingURL=redis.adapter.js.map