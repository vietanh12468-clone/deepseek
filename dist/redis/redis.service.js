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
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
let RedisService = class RedisService {
    constructor() {
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT) ?? 6379,
        });
        this.redis.on('connect', () => console.log('Connected to Redis'));
        this.redis.on('error', (err) => console.error('Redis error:', err));
    }
    async set(key, value, expireTime) {
        if (expireTime) {
            await this.redis.set(key, JSON.stringify(value), 'EX', expireTime);
        }
        else {
            await this.redis.set(key, JSON.stringify(value));
        }
    }
    async get(key) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
    }
    async del(key) {
        return await this.redis.del(key);
    }
    async exists(key) {
        const result = await this.redis.exists(key);
        return result === 1;
    }
    async expire(key, seconds) {
        await this.redis.expire(key, seconds);
    }
    async ttl(key) {
        return await this.redis.ttl(key);
    }
    async hsetField(key, field, value) {
        await this.redis.hset(key, field, JSON.stringify(value));
    }
    async hsetObject(key, value) {
        const stringifiedValue = {};
        for (const field in value) {
            stringifiedValue[field] = JSON.stringify(value[field]);
        }
        await this.redis.hset(key, stringifiedValue);
    }
    async hgetObject(key) {
        const data = await this.redis.hgetall(key);
        for (const field in data) {
            try {
                data[field] = JSON.parse(data[field]);
            }
            catch (error) {
                console.log(error);
            }
        }
        return data;
    }
    async hgetAll(pattern) {
        const keys = await this.redis.keys(pattern);
        const objects = await Promise.all(keys.map(async (key) => {
            return this.redis.hgetall(key);
        }));
        for (const object of objects) {
            for (const field in object) {
                try {
                    object[field] = JSON.parse(object[field]);
                }
                catch (error) {
                    console.log(error);
                }
            }
        }
        return objects.filter((object) => Object.keys(object).length > 0);
    }
    async hgetField(key, field) {
        const data = await this.redis.hget(key, field);
        return data ? JSON.parse(data) : null;
    }
    async deleteAllKeys(pattern) {
        const keys = await this.getAllKeys(pattern);
        if (keys.length === 0)
            return;
        const multi = this.redis.multi();
        keys.forEach((key) => {
            multi.del(key);
        });
        await multi.exec();
    }
    async getAllKeys(pattern) {
        return await this.redis.keys(pattern);
    }
    async setString(key, value, expireTime) {
        if (expireTime) {
            return await this.redis.set(key, value, 'EX', expireTime);
        }
        return await this.redis.set(key, value);
    }
    async getString(key) {
        return await this.redis.get(key);
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], RedisService);
//# sourceMappingURL=redis.service.js.map