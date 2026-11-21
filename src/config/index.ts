import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    supplierBaseUrl: process.env.SUPPLIER_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    temporal: {
        address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
        taskQueue: 'hotel-orchestration-queue',
    },
};