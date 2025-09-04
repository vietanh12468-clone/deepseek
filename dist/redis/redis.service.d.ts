export declare class RedisService {
    private readonly redis;
    constructor();
    set(key: string, value: any, expireTime?: number): Promise<void>;
    get(key: string): Promise<any>;
    del(key: string): Promise<number>;
    exists(key: string): Promise<boolean>;
    expire(key: string, seconds: number): Promise<void>;
    ttl(key: string): Promise<number>;
    hsetField(key: string, field: string, value: any): Promise<void>;
    hsetObject(key: string, value: any): Promise<void>;
    hgetObject(key: string): Promise<any>;
    hgetAll(pattern: string): Promise<any[]>;
    hgetField(key: string, field: string): Promise<any>;
    deleteAllKeys(pattern: string): Promise<void>;
    getAllKeys(pattern: string): Promise<string[]>;
    setString(key: string, value: string, expireTime?: number): Promise<string>;
    getString(key: string): Promise<string>;
}
