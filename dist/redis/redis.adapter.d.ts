export declare class RedisAdapter {
    private readonly client;
    constructor();
    get(key: string): Promise<string | null>;
    getJson<T>(key: string): Promise<T | null>;
    set(key: string, value: string, expireTime?: number): Promise<string>;
    setJson(key: string, value: any, expireTime?: number): Promise<string>;
    del(...keys: string[]): Promise<number>;
    hget(key: string, field: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string>>;
    hset(key: string, field: string, value: string): Promise<number>;
    hmset(key: string, hash: Record<string, string>): Promise<string>;
    hdel(key: string, ...fields: string[]): Promise<number>;
    lpush(key: string, ...values: string[]): Promise<number>;
    rpush(key: string, ...values: string[]): Promise<number>;
    lpop(key: string): Promise<string | null>;
    rpop(key: string): Promise<string | null>;
    lrange(key: string, start: number, stop: number): Promise<string[]>;
    sadd(key: string, ...members: string[]): Promise<number>;
    smembers(key: string): Promise<string[]>;
    srem(key: string, ...members: string[]): Promise<number>;
    exists(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    ttl(key: string): Promise<number>;
    publish(channel: string, message: string): Promise<number>;
    subscribe(channel: string, callback: (message: string) => void): Promise<void>;
    transaction(): Promise<any>;
    close(): Promise<void>;
}
