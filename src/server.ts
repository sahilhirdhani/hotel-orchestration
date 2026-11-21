import express from 'express';
import cors from 'cors';
import { config } from './config';
import { supplierRouter } from './suppliers/supplierRoutes';
import { hotelRouter } from './api/hotelRoutes';
import { healthRouter } from './api/healthRoutes';
import { redis } from './redis/redisClient';

const app = express();

app.use(cors());
app.use(express.json());

// Mount mock supplier endpoints: /supplierA/hotels, /supplierB/hotels
app.use(supplierRouter);

// Mount main business logic endpoint: /api/hotels
app.use('/api', hotelRouter);

// Mount health check endpoint: /health
app.use(healthRouter);

// Connect Redis on startup
redis.connect().catch((err) => {
  console.warn('[Redis] Initial connection warning (will retry automatically):', err.message);
});

app.listen(config.port, () => {
  console.log(`[Server] Hotel Offer Orchestrator running on http://localhost:${config.port}`);
});
