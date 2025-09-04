"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisModule = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("./redis.service");
const microservices_1 = require("@nestjs/microservices");
const redis_adapter_1 = require("./redis.adapter");
const redis_controller_1 = require("./redis.controller");
const ioredis_1 = require("ioredis");
let RedisModule = class RedisModule {
};
exports.RedisModule = RedisModule;
exports.RedisModule = RedisModule = __decorate([
    (0, common_1.Module)({
        imports: [
            microservices_1.ClientsModule.register([
                {
                    name: 'REDIS_VECTOR_SERVICE',
                    transport: microservices_1.Transport.REDIS,
                    options: {
                        host: process.env.REDIS_HOST ?? 'localhost',
                        port: isNaN(parseInt(process.env.REDIS_PORT, 10))
                            ? 6379
                            : parseInt(process.env.REDIS_PORT, 10),
                    },
                },
            ]),
        ],
        controllers: [redis_controller_1.RedisController],
        providers: [
            redis_service_1.RedisService,
            redis_adapter_1.RedisAdapter,
            {
                provide: 'REDIS',
                useFactory: () => {
                    return new ioredis_1.Redis({
                        host: process.env.REDIS_HOST ?? 'localhost',
                        port: isNaN(parseInt(process.env.REDIS_PORT, 10))
                            ? 6379
                            : parseInt(process.env.REDIS_PORT, 10),
                    });
                },
            },
        ],
        exports: [redis_service_1.RedisService, redis_adapter_1.RedisAdapter],
    })
], RedisModule);
//# sourceMappingURL=redis.module.js.map