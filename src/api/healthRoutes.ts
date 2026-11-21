import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config';
import { redis } from '../redis/redisClient';

export const healthRouter = Router();

// GET /health - Bonus point requirement
healthRouter.get('/health', async (_req: Request, res: Response): Promise<void> => {
  let supplierA = false;
  let supplierB = false;
  let redisUp = false;

  try {
    const resA = await axios.get(`${config.supplierBaseUrl}/supplierA/hotels`, { timeout: 2000 });
    supplierA = resA.status === 200;
  } catch (_) {
    supplierA = false;
  }

  try {
    const resB = await axios.get(`${config.supplierBaseUrl}/supplierB/hotels`, { timeout: 2000 });
    supplierB = resB.status === 200;
  } catch (_) {
    supplierB = false;
  }

  try {
    const ping = await redis.ping();
    redisUp = ping === 'PONG';
  } catch (_) {
    redisUp = false;
  }

  const allHealthy = supplierA && supplierB && redisUp;

  res.status(allHealthy ? 200 : 207).json({
    status: allHealthy ? 'healthy' : 'degraded',
    suppliers: {
      supplierA: supplierA ? 'UP' : 'DOWN',
      supplierB: supplierB ? 'UP' : 'DOWN',
    },
    redis: redisUp ? 'UP' : 'DOWN',
  });
});
